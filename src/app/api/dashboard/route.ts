import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { sessionEmail, likeExact } from '@/lib/session';
import { recentViews } from '@/lib/listing-views';
import { listingStrength } from '@/lib/listing-strength';

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
    // Identity comes only from the signed session cookie (set by the emailed sign-in link or claim verification).
    const email = sessionEmail(req);
    if (!email) {
      // 200 with signedIn:false (not 401) so signed-out visitors don't get a console error on /dashboard.
      return NextResponse.json({ signedIn: false, error: 'Please sign in.' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', likeExact(email))
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ email, listings: [], inquiries: [], totalInquiries: 0, monthInquiries: 0 });
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
        .select('id, name, slug, tier, rating, review_count, description, phone, website, hours, address, email, city, state, category_id, categories(name)')
        .in('id', listingIds);
      const { data: optRows } = await supabase
        .from('sms_queue')
        .select('listing_id, to_phone')
        .in('listing_id', listingIds)
        .eq('status', 'opt_in');
      const optMap = Object.fromEntries((optRows || []).map((r) => [r.listing_id, r.to_phone]));
      const views = await recentViews(listingIds, 30, supabase);
      // Position on the city x service page: Featured first, then Pro, then free, each by review count (lib/listings).
      const ranks = await Promise.all((listingData || []).map((l) => cityPosition(l)));
      listings = (listingData || []).map((l, i) => {
        const strength = listingStrength(l);
        const cat = Array.isArray(l.categories) ? l.categories[0] : l.categories;
        return {
          id: l.id, name: l.name, slug: l.slug, rating: l.rating, review_count: l.review_count,
          tier: planMap[l.id] || l.tier, smsPhone: optMap[l.id] || null, views30: views[l.id] || 0,
          city: l.city, categoryName: (cat as { name?: string } | null)?.name || null,
          strength: strength.score, checklist: strength.items, ...ranks[i],
        };
      });
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

    const views30 = listings.reduce((n, l) => n + (Number(l.views30) || 0), 0);
    return NextResponse.json({ email, listings, inquiries, totalInquiries, monthInquiries, views30 });
  } catch (e) {
    console.error('dashboard api error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

type RankRow = { id: string; tier: string | null; review_count: number | null; city: string | null; state: string | null; category_id: string | null };

/** Where this listing sits on its city x service page now, and where Pro would put it. Null when unknown. */
async function cityPosition(l: RankRow): Promise<{ cityRank: number | null; cityTotal: number | null; proRank: number | null }> {
  if (!l.city || !l.category_id) return { cityRank: null, cityTotal: null, proRank: null };
  try {
    const base = () => supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('category_id', l.category_id).eq('city', l.city).eq('state', l.state || 'FL');
    const mine = Number(l.review_count || 0);
    const [total, featured, proMore, freeMore] = await Promise.all([
      base(),
      base().or('featured.eq.true,tier.eq.featured').neq('id', l.id),
      base().eq('tier', 'pro').not('featured', 'is', true).gt('review_count', mine).neq('id', l.id),
      base().or('tier.is.null,tier.eq.free').not('featured', 'is', true).gt('review_count', mine).neq('id', l.id),
    ]);
    if (total.error || featured.error || proMore.error || freeMore.error) return { cityRank: null, cityTotal: null, proRank: null };
    const paidAbove = (featured.count || 0);
    const proCount = await base().eq('tier', 'pro').not('featured', 'is', true).neq('id', l.id);
    const isFree = (l.tier || 'free') === 'free';
    // Free: every Featured and Pro listing is above it, plus free listings with more reviews.
    const cityRank = isFree ? paidAbove + (proCount.count || 0) + (freeMore.count || 0) + 1 : paidAbove + (proMore.count || 0) + 1;
    const proRank = paidAbove + (proMore.count || 0) + 1;
    return { cityRank, cityTotal: total.count || null, proRank };
  } catch {
    return { cityRank: null, cityTotal: null, proRank: null };
  }
}
