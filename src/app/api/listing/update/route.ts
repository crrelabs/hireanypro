import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { listingId, email, name, description, phone, contactEmail, website, address, city, state, zip, hours, category_id } = body;

    if (!listingId || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Verify ownership: check that this email has an active subscription for this listing
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 403 });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('listing_id', listingId)
      .eq('status', 'active')
      .single();

    if (!sub) {
      return NextResponse.json({ error: 'You do not own this listing.' }, { status: 403 });
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (phone !== undefined) updates.phone = phone;
    if (contactEmail !== undefined) updates.email = contactEmail;
    if (website !== undefined) updates.website = website;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (zip !== undefined) updates.zip = zip;
    if (hours !== undefined) updates.hours = hours;
    if (category_id !== undefined) updates.category_id = category_id;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', listingId);

    if (error) {
      console.error('Listing update error:', error);
      return NextResponse.json({ error: 'Failed to update listing.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update API error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
