import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sessionEmail, likeExact } from '@/lib/session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Columns the edit form reads. Never select('*') here.
const LISTING_COLUMNS = 'name, description, phone, email, website, address, city, state, zip, category_id, hours, tier';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const email = sessionEmail(req);
    if (!email) {
      return json({ error: 'Your session expired. Please sign in again from the dashboard.' }, 401);
    }

    const { id: listingId } = await ctx.params;
    if (!listingId) {
      return json({ error: 'Missing required fields.' }, 400);
    }

    // Same ownership check as POST /api/listing/update: profile by session email, then an active subscription for this listing.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', likeExact(email))
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return json({ error: 'Profile not found.' }, 403);
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('listing_id', listingId)
      .eq('status', 'active')
      .single();

    if (!sub) {
      return json({ error: 'You do not own this listing.' }, 403);
    }

    const [{ data: listing, error: listingError }, { data: categories, error: catError }] = await Promise.all([
      supabase.from('listings').select(LISTING_COLUMNS).eq('id', listingId).maybeSingle(),
      supabase.from('categories').select('id, name, slug, icon, parent_id').order('name'),
    ]);

    if (listingError || catError) {
      console.error('Listing edit load error:', listingError || catError);
      return json({ error: 'Failed to load listing.' }, 500);
    }
    if (!listing) {
      return json({ error: 'Listing not found.' }, 404);
    }

    return json({ listing, categories: categories || [] });
  } catch (err) {
    console.error('Listing edit API error:', err);
    return json({ error: 'Server error.' }, 500);
  }
}
