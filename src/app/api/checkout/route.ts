import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const PRICE_IDS = {
  pro: 'price_1T6EcTFLKMTWNENlmdzkW5hd',
  featured: 'price_1T6EcTFLKMTWNENlovU3r7iH',
} as const;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { plan, listingId, email } = await req.json();

    if (!plan || !['pro', 'featured'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
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
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[listingId]', listingId || '');
    params.append('metadata[email]', email);
    params.append('metadata[plan]', plan);
    params.append('success_url', `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${appUrl}/pricing`);

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
      console.error('Stripe API error:', data);
      return NextResponse.json({ error: data.error?.message || 'Stripe error' }, { status: 500 });
    }

    return NextResponse.json({ url: data.url });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
