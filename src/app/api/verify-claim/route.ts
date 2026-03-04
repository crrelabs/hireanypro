import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
    }

    // Find claim by verification token
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    if (claim.verified) {
      return NextResponse.json({ success: true, email: claim.email, message: 'Already verified' });
    }

    // Check expiration
    if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification link has expired. Please claim again.' }, { status: 400 });
    }

    // Check listing isn't already claimed by someone else
    const { data: listing } = await supabase
      .from('listings')
      .select('id, claimed')
      .eq('id', claim.listing_id)
      .single();

    if (listing?.claimed) {
      return NextResponse.json({ error: 'This listing has already been claimed by someone else.' }, { status: 400 });
    }

    // Mark as verified
    await supabase
      .from('claims')
      .update({ verified: true })
      .eq('id', claim.id);

    // Get/create profile
    const { data: profile } = await supabase
      .from('profiles')
      .upsert({ email: claim.email }, { onConflict: 'email' })
      .select('id')
      .single();

    // Update listing
    await supabase
      .from('listings')
      .update({ claimed: true, owner_id: profile?.id })
      .eq('id', claim.listing_id);

    // Create free subscription
    if (profile) {
      await supabase.from('subscriptions').insert({
        listing_id: claim.listing_id,
        profile_id: profile.id,
        plan: 'free',
        status: 'active',
      });
    }

    return NextResponse.json({ success: true, email: claim.email });
  } catch (error: unknown) {
    console.error('Verify claim error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
