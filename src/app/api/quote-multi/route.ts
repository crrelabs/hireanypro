import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { sendMail } from '@/lib/mailer';
import { getCategoryBySlug, getCategoryCities } from '@/lib/listings';
import { SITE, TEAM_INBOX, EMAIL_RE, esc, clip, firstName, shell, isPaidTier, bizEmailOf, deliverToListing, type LeadListing } from '@/lib/lead-delivery';

/**
 * "Get up to 3 free quotes" from a category+city page. The server picks the pros (never the browser):
 * paid listings first, then claimed, then reachable (has email), then best reviewed.
 * Saves one inquiry per pro so every existing lead flow (dashboard, teaser, follow-up) works unchanged.
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

// Listings we never auto-select for multi-quote routing.
const NEVER_ROUTE = new Set(['rovira-property-management-pinecrest', 'monster-cuts-orlando']);
const MAX_PROS = 3;

type Row = LeadListing & { rating: number | null; review_count: number | null };

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(`multi:${ip}`, 3)) {
      return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
    }
    const body = await req.json();
    const name = clip(body.name, 100);
    const email = clip(body.email, 200).toLowerCase();
    const phone = clip(body.phone, 40);
    const message = clip(body.message, 3000);
    const categorySlug = clip(body.categorySlug, 80);
    const citySlugIn = clip(body.citySlug, 80);

    if (isBot(body.website)) return NextResponse.json({ success: true, count: 0 });
    if (!body.turnstileToken || !(await verifyTurnstile(body.turnstileToken))) {
      return NextResponse.json({ error: 'That was a little fast. Please wait a second and try again.' }, { status: 400 });
    }
    if (!name || !email || !message || !categorySlug || !citySlugIn) {
      return NextResponse.json({ error: 'Please fill in your name, email and what you need done.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (message.length < 10) return NextResponse.json({ error: 'Please describe the job in a few more words.' }, { status: 400 });

    // Abuse cap: at most 3 multi-quote requests per homeowner email per 24h (9 pros).
    const { count: recentCount } = await supabase.from('inquiries').select('id', { count: 'exact', head: true })
      .ilike('email', email).like('message', '[Multi-quote]%').gte('created_at', new Date(Date.now() - 86400e3).toISOString());
    if ((recentCount || 0) >= 9) {
      return NextResponse.json({ error: 'You have sent several requests today. We will be in touch; reply to our email if you need more help.' }, { status: 429 });
    }

    const category = await getCategoryBySlug(categorySlug);
    if (!category) return NextResponse.json({ error: 'Unknown service' }, { status: 404 });
    const group = (await getCategoryCities(category.id)).find((g) => g.slug === citySlugIn);
    if (!group) return NextResponse.json({ error: 'Unknown city' }, { status: 404 });

    const { data: rows } = await supabase
      .from('listings')
      .select('id, name, slug, email, phone, tier, claimed, city, rating, review_count, categories(name, slug)')
      .eq('category_id', category.id)
      .in('city', group.variants)
      .order('review_count', { ascending: false, nullsFirst: false })
      .limit(200);
    const candidates = ((rows || []) as unknown as Row[])
      .filter((l) => !NEVER_ROUTE.has(l.slug) && !l.slug.startsWith('zz-hap-test'));
    const score = (l: Row) => (isPaidTier(l.tier) ? 1e6 : 0) + (l.claimed ? 1e5 : 0) + (bizEmailOf(l) ? 1e4 : 0)
      + Math.min(l.review_count || 0, 5000) + (l.rating || 0);
    const picked = candidates.sort((a, b) => score(b) - score(a)).slice(0, MAX_PROS);
    if (picked.length === 0) return NextResponse.json({ error: 'No pros found for this city yet.' }, { status: 404 });

    // Internal QA (our own addresses): save as 'internal' and never contact the businesses.
    const isTest = /@(hireanypro|crrelabs)\.com$/.test(email);
    const lead = { name, email, phone, message };
    const tagged = `[Multi-quote] ${message}`;
    const results: string[] = [];
    for (const l of picked) {
      const be = bizEmailOf(l);
      const { data: saved } = await supabase.from('inquiries').insert({
        listing_id: l.id, name, email, phone: phone || null,
        sms_opt_in: !!(phone && body.smsOptIn === true), message: tagged,
        routed_to: isPaidTier(l.tier) && be ? be : TEAM_INBOX,
        ...(isTest ? { status: 'internal' } : {}),
      }).select('id').single();
      const note = isTest ? 'TEST: business not contacted'
        : await deliverToListing(supabase, l, lead, saved?.id, { skipTeaserIfRecent: true });
      results.push(`- ${l.name} (${l.tier || 'free'}${l.claimed ? ', claimed' : ', unclaimed'}) ${SITE}/listing/${l.slug}\n  ${note}`);
    }

    const cityName = group.name;
    const proList = picked.map((l) => `<li><a href="${SITE}/listing/${l.slug}">${esc(l.name)}</a></li>`).join('');
    await Promise.allSettled([
      sendMail({
        to: email,
        subject: `Your ${category.name.toLowerCase()} quote request in ${cityName}`,
        html: shell(`<p>Hi ${esc(firstName(name))},</p><p>Thanks! We're sending your request to ${picked.length} ${esc(category.name.toLowerCase())} ${picked.length === 1 ? 'pro' : 'pros'} in ${esc(cityName)}:</p><ul>${proList}</ul>` +
          `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(message)}</p>` +
          `<p>We'll follow up if you don't hear back. Questions? Just reply to this email.</p><p>The HireAnyPro team</p>`),
      }),
      sendMail({
        to: TEAM_INBOX,
        replyTo: email,
        subject: `${isTest ? '[TEST] ' : ''}New multi-quote request: ${category.name} in ${cityName} (${picked.length} pros)`,
        text: `Page: ${SITE}/services/${category.slug}/${citySlugIn}\nFrom: ${name} <${email}>${phone ? `\nPhone: ${phone}` : ''}\n\n${message}\n\nSent to:\n${results.join('\n')}`,
      }),
    ]);
    return NextResponse.json({ success: true, count: picked.length, pros: picked.map((l) => l.name) });
  } catch (error: unknown) {
    console.error('Multi-quote error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
