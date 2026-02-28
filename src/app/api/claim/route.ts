import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { listingId, email } = await req.json();

    if (!listingId || !email) {
      return NextResponse.json({ error: 'Listing ID and email required' }, { status: 400 });
    }

    // Check listing exists
    const { data: listing } = await supabase
      .from('listings')
      .select('id, claimed')
      .eq('id', listingId)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.claimed) {
      return NextResponse.json({ error: 'This listing has already been claimed' }, { status: 400 });
    }

    // Create/get profile
    const { data: profile } = await supabase
      .from('profiles')
      .upsert({ email }, { onConflict: 'email' })
      .select('id')
      .single();

    // Create claim (auto-verified)
    await supabase.from('claims').insert({
      listing_id: listingId,
      email,
      verified: true,
    });

    // Update listing
    await supabase
      .from('listings')
      .update({ claimed: true, owner_id: profile?.id })
      .eq('id', listingId);

    // Create free subscription
    if (profile) {
      await supabase.from('subscriptions').insert({
        listing_id: listingId,
        profile_id: profile.id,
        plan: 'free',
        status: 'active',
      });
    }

    return NextResponse.json({ success: true, profileId: profile?.id });
  } catch (error: unknown) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
