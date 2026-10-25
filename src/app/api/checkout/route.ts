import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { sessionEmail, likeExact } from '@/lib/session';

const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  featured: process.env.STRIPE_FEATURED_PRICE_ID || '',
} as const;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Stripe Checkout for Pro/Featured. Every payment is tied to a real listing, and a claimed listing can only be
 * upgraded by its owner. (Before: checkout accepted any or no listing, so a payer could end up with nothing,
 * or take over someone else's claimed listing by paying for it.)
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(`checkout:${ip}`, 5)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const plan = body.plan;
    const rawListing = typeof body.listingId === 'string' ? body.listingId.trim() : '';
    const signedIn = sessionEmail(req);
    const email = (signedIn || (typeof body.email === 'string' ? body.email : '')).trim().toLowerCase();

    if (!plan || !['pro', 'featured'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!rawListing) {
      return NextResponse.json({ error: 'Please choose your business first.', needListing: true }, { status: 400 });
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('id, name, slug, tier, claimed')
      .eq(UUID_RE.test(rawListing) ? 'id' : 'slug', rawListing)
      .maybeSingle();
    if (!listing) {
      return NextResponse.json({ error: 'We could not find that business. Please choose it again.', needListing: true }, { status: 404 });
    }
    if (listing.tier === plan) {
      return NextResponse.json({ error: `${listing.name} is already on ${plan === 'pro' ? 'Pro' : 'Featured'}.` }, { status: 400 });
    }

    if (listing.claimed) {
      // Only the verified owner may pay to upgrade a claimed listing.
      const { data: profile } = await supabase.from('profiles').select('id').ilike('email', likeExact(email)).limit(1).maybeSingle();
      let owns = false;
      if (profile) {
        const { count } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true })
          .eq('profile_id', profile.id).eq('listing_id', listing.id).eq('status', 'active');
        owns = (count || 0) > 0;
      }
      if (!owns) {
        return NextResponse.json({
          error: signedIn
            ? 'This listing is claimed by a different account. Email iris@hireanypro.com if it is yours.'
            : 'This listing is already claimed. Use the email you claimed it with, or sign in to your dashboard first.',
        }, { status: 403 });
      }
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    const appUrl = 'https://hireanypro.com';

    // Use Stripe REST API directly to avoid SDK issues on Vercel
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('customer_email', email);
    params.append('client_reference_id', listing.id);
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[listingId]', listing.id);
    params.append('metadata[email]', email);
    params.append('metadata[plan]', plan);
    params.append('subscription_data[metadata][listingId]', listing.id);
    params.append('subscription_data[metadata][plan]', plan);
    params.append('success_url', `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${appUrl}/pricing?listing=${encodeURIComponent(listing.slug)}`);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Stripe API error:', data?.error?.message);
      return NextResponse.json({ error: 'Payment page could not be opened. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ url: data.url });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
