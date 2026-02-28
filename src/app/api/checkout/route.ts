import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { plan, listingId, email } = await req.json();

    if (!plan || !['pro', 'featured'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hireanypro.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { listingId: listingId || '', email, plan },
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
