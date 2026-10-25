import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { sendMail } from '@/lib/mailer';
import { SITE, TEAM_INBOX, EMAIL_RE, esc, clip, firstName, shell, isPaidTier, bizEmailOf, deliverToListing, type LeadListing } from '@/lib/lead-delivery';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

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
      return NextResponse.json({ error: 'CAPTCHA verification failed.' }, { status: 400 });
    }

    if (!listingId || !name || !email || !message) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Look the listing up server-side; never trust the browser to say where a lead goes.
    const { data: listing } = await supabase
      .from('listings')
      .select('id, name, slug, email, phone, tier, claimed, city, categories(name, slug)')
      .eq('id', listingId)
      .single<LeadListing>();
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const bizEmail = bizEmailOf(listing);
    const routedTo = isPaidTier(listing.tier) && bizEmail ? bizEmail : TEAM_INBOX;

    const { data: saved, error } = await supabase.from('inquiries').insert({
      listing_id: listing.id,
      name,
      email,
      phone: phone || null,
      sms_opt_in: !!(phone && body.smsOptIn === true),
      message,
      routed_to: routedTo,
    }).select('id').single();

    if (error) {
      console.error('Quote insert error:', error);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    const cat = listing.categories?.name || 'home service';
    const city = listing.city || 'your area';
    const listingUrl = `${SITE}/listing/${listing.slug}`;

    // 1) Homeowner confirmation.
    const confirm = sendMail({
      to: email,
      subject: `We got your quote request for ${listing.name}`,
      html: shell(`<p>Hi ${esc(firstName(name))},</p><p>Thanks for your request. We're getting it to <strong>${esc(listing.name)}</strong> now, and we'll follow up if you don't hear back.</p>` +
        `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(message)}</p>` +
        `<p>Want more quotes? <a href="${listing.categories?.slug ? `${SITE}/category/${listing.categories.slug}` : `${SITE}/categories`}">Compare other ${esc(cat.toLowerCase())} pros</a>.</p>` +
        `<p>Questions? Just reply to this email.</p><p>The HireAnyPro team</p>`),
    });

    // 2) Business delivery (SMS alert / paid lead / free teaser).
    const note = await deliverToListing(supabase, listing, { name, email, phone, message }, saved?.id);

    // 3) Team copy with full details, so every lead gets followed up.
    const team = sendMail({
      to: TEAM_INBOX,
      replyTo: email,
      subject: `New quote request: ${listing.name} (${listing.tier || 'free'}${listing.claimed ? ', claimed' : ', unclaimed'})`,
      text: `Listing: ${listing.name} (${cat}, ${city})\n${listingUrl}\nRouted to: ${routedTo}\nDelivery: ${note}\n\nFrom: ${name} <${email}>${phone ? `\nPhone: ${phone}` : ''}\n\n${message}`,
    });

    await Promise.allSettled([confirm, team]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
