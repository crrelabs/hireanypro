import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyUpgrade } from '@/lib/notify';
import Stripe from 'stripe';
import { revalidateListing } from '@/lib/revalidate';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('Webhook error: STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  // Verify against the raw body (must not be JSON-parsed first). Default tolerance is 300s.
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret, 300);
  } catch (err) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {

    if (event.type === 'checkout.session.completed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = event.data.object as any;
      let { listingId, email, plan } = session.metadata || {};
      listingId = listingId || session.client_reference_id || '';
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      // Use customer_email as fallback
      email = email || session.customer_email;
      plan = plan || 'pro';

      if (!email) {
        return NextResponse.json({ error: 'No email in metadata' }, { status: 400 });
      }

      // If listingId is a slug (not UUID), look up the real ID
      if (listingId && !listingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/)) {
        const { data: listingBySlug } = await supabase
          .from('listings')
          .select('id')
          .eq('slug', listingId)
          .single();
        if (listingBySlug) listingId = listingBySlug.id;
        else listingId = ''; // slug not found, fall through to email-based lookup
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
        await revalidateListing(supabase, listingId);

        // Notify Carlos of upgrade
        const { data: upgradedListing } = await supabase.from('listings').select('name, slug').eq('id', listingId).single();
        if (upgradedListing) {
          notifyUpgrade(upgradedListing.name, email, plan, upgradedListing.slug).catch(() => {});
        }
      }
    }

    if (event.type === 'customer.subscription.updated') {
      // Keep the site's Pro flag in step with Stripe: a subscription that ends up canceled/unpaid loses Pro.
      // past_due keeps Pro during Stripe's retry window; it is downgraded when Stripe finally cancels.
      const subscription = event.data.object as Stripe.Subscription;
      if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
        const { data: sub } = await supabase.from('subscriptions').select('listing_id').eq('stripe_subscription_id', subscription.id).maybeSingle();
        if (sub?.listing_id) {
          await supabase.from('listings').update({ tier: 'free' }).eq('id', sub.listing_id);
          await revalidateListing(supabase, sub.listing_id);
          await supabase.from('subscriptions').update({ status: 'canceled', plan: 'free' }).eq('stripe_subscription_id', subscription.id);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
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
        await revalidateListing(supabase, sub.listing_id);

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
