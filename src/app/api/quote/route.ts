import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { sendMail } from '@/lib/mailer';
import {
  SITE, TEAM_INBOX, EMAIL_RE, esc, clip, firstName, shell, isPaidTier, bizEmailOf, deliverToListing,
  routable, proScore, isInternalEmail, type LeadListing,
} from '@/lib/lead-delivery';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

const MAX_EXTRA = 2; // "Also get quotes from up to 2 other top-rated pros"
type Row = LeadListing & { category_id: string | null; state: string | null; rating: number | null; review_count: number | null };

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { listingId, turnstileToken, website } = body;
    const name = clip(body.name, 100);
    const email = clip(body.email, 200).toLowerCase();
    const phone = clip(body.phone, 40);
    const message = clip(body.message, 3000);

    if (isBot(website)) {
      return NextResponse.json({ success: true });
    }

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return NextResponse.json({ error: 'That was a little fast. Please wait a second and try again.' }, { status: 400 });
    }

    if (!listingId || !name || !email || !message) {
      return NextResponse.json({ error: 'Please fill in your name, email and what you need done.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Look the listing up server-side; never trust the browser to say where a lead goes.
    const { data: listing } = await supabase
      .from('listings')
      .select('id, name, slug, email, phone, tier, claimed, city, state, category_id, rating, review_count, categories(name, slug)')
      .eq('id', listingId)
      .single<Row>();
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Internal QA (our own addresses): save as 'internal' and never contact any business.
    const isTest = isInternalEmail(email);
    const lead = { name, email, phone, message };

    // "Also get quotes from up to 2 other top-rated pros" (offered on free/unclaimed listings only, never on paid ones).
    // The server picks them (same category, city and state), using the same ranking as the city multi-quote form.
    let extras: Row[] = [];
    if (body.alsoOthers === true && !isPaidTier(listing.tier) && listing.category_id && listing.city) {
      const { count: recent } = await supabase.from('inquiries').select('id', { count: 'exact', head: true })
        .ilike('email', email).like('message', '[Multi-quote]%').gte('created_at', new Date(Date.now() - 86400e3).toISOString());
      if ((recent || 0) < 9) {
        let q = supabase.from('listings')
          .select('id, name, slug, email, phone, tier, claimed, city, state, category_id, rating, review_count, categories(name, slug)')
          .eq('category_id', listing.category_id).eq('city', listing.city).neq('id', listing.id);
        if (listing.state) q = q.eq('state', listing.state);
        const { data: rows } = await q.order('review_count', { ascending: false, nullsFirst: false }).limit(100);
        extras = ((rows || []) as unknown as Row[]).filter(routable).sort((a, b) => proScore(b) - proScore(a)).slice(0, MAX_EXTRA);
      }
    }

    const save = async (l: Row, msg: string) => {
      const be = bizEmailOf(l);
      const { data, error } = await supabase.from('inquiries').insert({
        listing_id: l.id, name, email, phone: phone || null,
        sms_opt_in: !!(phone && body.smsOptIn === true), message: msg,
        routed_to: isPaidTier(l.tier) && be ? be : TEAM_INBOX,
        ...(isTest ? { status: 'internal' } : {}),
      }).select('id').single();
      if (error) console.error('Quote insert error:', error);
      return { id: data?.id as string | undefined, ok: !error };
    };

    const primary = await save(listing, message);
    if (!primary.ok) return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });

    const cat = listing.categories?.name || 'home service';
    const city = listing.city || 'your area';
    const listingUrl = `${SITE}/listing/${listing.slug}`;

    // Business delivery (SMS alert / paid lead / free teaser), primary first, then the extra pros.
    const results: string[] = [];
    const note = isTest ? 'TEST: business not contacted'
      : listing.slug === 'rovira-property-management-pinecrest' ? 'Do-not-contact listing: business not contacted (team follows up)'
      : await deliverToListing(supabase, listing, lead, primary.id);
    results.push(`- ${listing.name} (${listing.tier || 'free'}${listing.claimed ? ', claimed' : ', unclaimed'}) ${listingUrl}\n  ${note}`);
    const sentExtras: Row[] = [];
    for (const l of extras) {
      const saved = await save(l, `[Multi-quote] ${message}`);
      if (!saved.ok) continue;
      sentExtras.push(l);
      const n = isTest ? 'TEST: business not contacted' : await deliverToListing(supabase, l, lead, saved.id, { skipTeaserIfRecent: true });
      results.push(`- ${l.name} (${l.tier || 'free'}${l.claimed ? ', claimed' : ', unclaimed'}) ${SITE}/listing/${l.slug}\n  ${n}`);
    }

    const all = [listing, ...sentExtras];
    const proList = all.map((l) => `<li><a href="${SITE}/listing/${l.slug}">${esc(l.name)}</a></li>`).join('');
    const confirm = sendMail({
      to: email,
      campaign: 'quote_confirm', subject: sentExtras.length ? `Your ${cat.toLowerCase()} quote request in ${city}` : `We got your quote request for ${listing.name}`,
      html: shell(`<p>Hi ${esc(firstName(name))},</p>` +
        (sentExtras.length
          ? `<p>Thanks for your request. We're sending it to ${all.length} ${esc(cat.toLowerCase())} pros in ${esc(city)}:</p><ul>${proList}</ul>`
          : `<p>Thanks for your request. We're getting it to <strong>${esc(listing.name)}</strong> now, and we'll follow up if you don't hear back.</p>`) +
        `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(message)}</p>` +
        (sentExtras.length ? `<p>We'll follow up if you don't hear back.</p>` :
          `<p>Want more quotes? <a href="${listing.categories?.slug ? `${SITE}/category/${listing.categories.slug}` : `${SITE}/categories`}">Compare other ${esc(cat.toLowerCase())} pros</a>.</p>`) +
        `<p>Questions? Just reply to this email.</p><p>The HireAnyPro team</p>`),
    });

    // Team copy with full details, so every lead gets followed up.
    const team = sendMail({
      to: TEAM_INBOX,
      replyTo: email,
      subject: `${isTest ? '[TEST] ' : ''}New quote request: ${listing.name} (${listing.tier || 'free'}${listing.claimed ? ', claimed' : ', unclaimed'})${sentExtras.length ? ` + ${sentExtras.length} more pros` : ''}`,
      text: `Listing: ${listing.name} (${cat}, ${city})\n${listingUrl}\n\nFrom: ${name} <${email}>${phone ? `\nPhone: ${phone}` : ''}\n\n${message}\n\nSent to:\n${results.join('\n')}`,
    });

    await Promise.allSettled([confirm, team]);
    return NextResponse.json({ success: true, count: all.length, pros: all.map((l) => l.name) });
  } catch (error: unknown) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
