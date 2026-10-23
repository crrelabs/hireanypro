import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { sendMail } from '@/lib/mailer';
import { isSuppressed, signUnsub } from '@/lib/suppression';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

const SITE = 'https://hireanypro.com';
const TEAM_INBOX = 'iris@hireanypro.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const firstName = (n: string) => n.split(/\s+/)[0] || 'there';

type ListingRow = {
  id: string; name: string; slug: string; email: string | null; tier: string | null; claimed: boolean | null;
  city: string | null; categories: { name: string; slug: string } | null;
};

const shell = (inner: string, footer = '') =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5">${inner}` +
  `<p style="color:#888;font-size:12px;margin-top:32px">HireAnyPro · CRRE Labs LLC · 12394 SW 82 Ave, Pinecrest FL 33156${footer}</p></div>`;

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
      .select('id, name, slug, email, tier, claimed, city, categories(name, slug)')
      .eq('id', listingId)
      .single<ListingRow>();
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const isPaid = listing.tier === 'pro' || listing.tier === 'featured';
    const bizEmail = listing.email && EMAIL_RE.test(listing.email.trim()) ? listing.email.trim().toLowerCase() : null;
    const routedTo = isPaid && bizEmail ? bizEmail : TEAM_INBOX;

    const { error } = await supabase.from('inquiries').insert({
      listing_id: listing.id,
      name,
      email,
      phone: phone || null,
      message,
      routed_to: routedTo,
    });

    if (error) {
      console.error('Quote insert error:', error);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    // Deliver the lead. Email failures never fail the request; the inquiry is already saved.
    const cat = listing.categories?.name || 'home service';
    const city = listing.city || 'your area';
    const listingUrl = `${SITE}/listing/${listing.slug}`;
    const sends: Promise<boolean>[] = [];

    // 1) Homeowner confirmation.
    sends.push(sendMail({
      to: email,
      subject: `We got your quote request for ${listing.name}`,
      html: shell(`<p>Hi ${esc(firstName(name))},</p><p>Thanks for your request. We're getting it to <strong>${esc(listing.name)}</strong> now, and we'll follow up if you don't hear back.</p>` +
        `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(message)}</p>` +
        `<p>Want more quotes? <a href="${listing.categories?.slug ? `${SITE}/category/${listing.categories.slug}` : `${SITE}/categories`}">Compare other ${esc(cat.toLowerCase())} pros</a>.</p>` +
        `<p>Questions? Just reply to this email.</p><p>The HireAnyPro team</p>`),
    }));

    // 2) Team copy with full details, so every lead gets followed up.
    sends.push(sendMail({
      to: TEAM_INBOX,
      replyTo: email,
      subject: `New quote request: ${listing.name} (${listing.tier || 'free'}${listing.claimed ? ', claimed' : ', unclaimed'})`,
      text: `Listing: ${listing.name} (${cat}, ${city})\n${listingUrl}\nRouted to: ${routedTo}\n\nFrom: ${name} <${email}>${phone ? `\nPhone: ${phone}` : ''}\n\n${message}`,
    }));

    if (isPaid && bizEmail) {
      // 3a) Paid listings get the lead straight to their inbox.
      sends.push(sendMail({
        to: bizEmail,
        replyTo: email,
        subject: `New quote request from ${name} via HireAnyPro`,
        html: shell(`<p>You have a new customer request on HireAnyPro.</p>` +
          `<p><strong>Name:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}${phone ? `<br><strong>Phone:</strong> ${esc(phone)}` : ''}</p>` +
          `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(message)}</p>` +
          `<p>Reply to this email to answer them directly.</p>`),
      }));
    } else if (bizEmail && !(await isSuppressed(bizEmail))) {
      // 3b) Free or unclaimed listings: tell the business a customer is waiting, and how to get leads directly.
      const unsub = `${SITE}/api/unsubscribe?t=${encodeURIComponent(signUnsub(bizEmail))}`;
      const cta = listing.claimed
        ? { href: `${SITE}/dashboard?utm_source=lead_email&utm_medium=email&utm_campaign=lead_alert`, label: 'See the request in your dashboard' }
        : { href: `${SITE}/claim?listing=${encodeURIComponent(listing.slug)}&utm_source=lead_email&utm_medium=email&utm_campaign=lead_alert`, label: 'Claim your free listing to respond' };
      const excerpt = message.length > 280 ? `${message.slice(0, 280)}…` : message;
      sends.push(sendMail({
        to: bizEmail,
        subject: `A customer in ${city} asked ${listing.name} for a quote`,
        headers: {
          'List-Unsubscribe': `<${unsub}>, <mailto:${TEAM_INBOX}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        html: shell(`<p>Hi ${esc(listing.name)},</p><p>${esc(firstName(name))} found your business on HireAnyPro and requested a quote:</p>` +
          `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(excerpt)}</p>` +
          `<p><a href="${cta.href}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${cta.label}</a></p>` +
          `<p style="font-size:14px;color:#444">${listing.claimed ? 'Upgrade to Pro ($9/mo) to get customer requests delivered straight to your inbox with their contact details.' : 'Claiming is free and takes about two minutes. Once you have verified you own the business, you will see this customer\u2019s contact details and future requests in your dashboard.'}</p>`,
          ` · <a href="${unsub}" style="color:#888">Unsubscribe</a>`),
      }));
    }

    await Promise.allSettled(sends);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
