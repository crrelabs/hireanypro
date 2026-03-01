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
      let { listingId, email, plan } = session.metadata || {};
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      // Use customer_email as fallback
      email = email || session.customer_email;
      plan = plan || 'pro';

      if (!email) {
        return NextResponse.json({ error: 'No email in metadata' }, { status: 400 });
      }

      // Upsert profile
      const { data: profile } = await supabase
        .from('profiles')
        .upsert({ email, stripe_customer_id: customerId }, { onConflict: 'email' })
        .select('id')
        .single();

      if (!profile) {
        return NextResponse.json({ error: 'Profile creation failed' }, { status: 500 });
      }

      // If no listingId, find the user's FREE claimed listing (most recently claimed)
      if (!listingId) {
        // First try: find a free-tier listing owned by this user (most likely what they're upgrading)
        const { data: freeSub } = await supabase
          .from('subscriptions')
          .select('listing_id')
          .eq('profile_id', profile.id)
          .eq('plan', 'free')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (freeSub?.listing_id) {
          listingId = freeSub.listing_id;
        } else {
          // Fallback: most recent verified claim
          const { data: claim } = await supabase
            .from('claims')
            .select('listing_id')
            .eq('email', email)
            .eq('verified', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (claim?.listing_id) {
            listingId = claim.listing_id;
          }
        }
      }

      if (listingId) {
        // Update existing subscription or create new one
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('listing_id', listingId)
          .eq('profile_id', profile.id)
          .single();

        if (existingSub) {
          await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              plan,
              status: 'active',
            })
            .eq('id', existingSub.id);
        } else {
          await supabase.from('subscriptions').insert({
            listing_id: listingId,
            profile_id: profile.id,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan,
            status: 'active',
          });
        }

        // Update listing tier
        await supabase
          .from('listings')
          .update({ tier: plan, claimed: true })
          .eq('id', listingId);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const subId = subscription.id;

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
