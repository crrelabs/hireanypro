import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { listingId, email, plan } = session.metadata || {};
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (!email) {
        return NextResponse.json({ error: 'No email in metadata' }, { status: 400 });
      }

      // Upsert profile
      const { data: profile } = await supabase
        .from('profiles')
        .upsert({ email, stripe_customer_id: customerId }, { onConflict: 'email' })
        .select('id')
        .single();

      // Create subscription record
      if (profile && listingId) {
        await supabase.from('subscriptions').insert({
          listing_id: listingId,
          profile_id: profile.id,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan: plan || 'pro',
          status: 'active',
        });

        // Update listing tier
        await supabase
          .from('listings')
          .update({ tier: plan || 'pro', claimed: true })
          .eq('id', listingId);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const subId = subscription.id;

      // Find and downgrade
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('listing_id')
        .eq('stripe_subscription_id', subId)
        .single();

      if (sub?.listing_id) {
        await supabase
          .from('listings')
          .update({ tier: 'free' })
          .eq('id', sub.listing_id);

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', plan: 'free' })
          .eq('stripe_subscription_id', subId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
