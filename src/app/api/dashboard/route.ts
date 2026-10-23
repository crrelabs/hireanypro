import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`dashboard:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!profile) {
      return NextResponse.json({ listings: [], inquiries: [], totalInquiries: 0, monthInquiries: 0 });
    }

    // Get claimed listings via subscriptions
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('listing_id, plan')
      .eq('profile_id', profile.id)
      .eq('status', 'active');

    const listingIds = (subs || []).map((s) => s.listing_id).filter(Boolean);
    const planMap = Object.fromEntries((subs || []).map((s) => [s.listing_id, s.plan]));

    let listings: Array<Record<string, unknown>> = [];
    if (listingIds.length > 0) {
      const { data: listingData } = await supabase
        .from('listings')
        .select('id, name, slug, tier, rating, review_count')
        .in('id', listingIds);
      listings = (listingData || []).map((l) => ({ ...l, tier: planMap[l.id] || l.tier }));
    }

    // Get inquiries for these listings
    let inquiries: Array<Record<string, unknown>> = [];
    let totalInquiries = 0;
    let monthInquiries = 0;

    if (listingIds.length > 0) {
      const { data: inqData } = await supabase
        .from('inquiries')
        .select('*')
        .in('listing_id', listingIds)
        .neq('status', 'internal')
        .order('created_at', { ascending: false })
        .limit(20);
      // Free listings only get a teaser: never send homeowner contact details to the browser.
      const paid = new Set(listings.filter((l) => l.tier === 'pro' || l.tier === 'featured').map((l) => l.id));
      inquiries = (inqData || []).map((q) => paid.has(q.listing_id)
        ? q
        : { id: q.id, listing_id: q.listing_id, created_at: q.created_at, name: 'Locked lead', email: '', phone: null, message: '' });

      const { count: total } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .neq('status', 'internal');
      totalInquiries = total || 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: monthCount } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .neq('status', 'internal')
        .gte('created_at', thirtyDaysAgo);
      monthInquiries = monthCount || 0;
    }

    return NextResponse.json({ listings, inquiries, totalInquiries, monthInquiries });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
