import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { recentViews } from '@/lib/listing-views';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { normalizeHours } from '@/lib/hours';
import { isBoilerplateDescription, shouldIndexCityPage } from '@/lib/directory-content';
import { cityPageSlug, stateCode } from '@/lib/geo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,200}$/;

/**
 * "Your listing today" facts for an owner deciding whether to claim: real 30-day page views (bot-filtered beacon),
 * where the business ranks among same-category pros in its city by Google review count, how many of those are claimed,
 * and which details are missing or generic. Everything here is public on the site already except the view count,
 * which unclaimed listing pages also show (N >= 2). Unclaimed listings only.
 */
export async function GET(req: NextRequest) {
  if (isRateLimited(`claim-preview:${getClientIp(req)}`, 30)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const key = (req.nextUrl.searchParams.get('listing') || '').trim();
  if (!UUID.test(key) && !SLUG.test(key)) return NextResponse.json({ error: 'bad_listing' }, { status: 400 });

  const { data: l, error } = await supabase
    .from('listings')
    .select('id, slug, name, city, state, category_id, claimed, review_count, rating, website, hours, description, phone, categories(name, slug)')
    .eq(UUID.test(key) ? 'id' : 'slug', key)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  if (!l || l.claimed || l.slug.startsWith('zz-hap-test')) return NextResponse.json({ available: false });

  const cat = (Array.isArray(l.categories) ? l.categories[0] : l.categories) as { name: string; slug: string } | null;
  const st = stateCode(l.state);
  let cityCount = 0, ahead = 0, claimedInCity = 0;
  if (l.city && l.category_id) {
    const base = () => supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('category_id', l.category_id).eq('city', l.city).eq('state', st);
    const [all, better, claimed] = await Promise.all([
      base(),
      base().gt('review_count', l.review_count || 0),
      base().eq('claimed', true),
    ]);
    cityCount = all.count || 0;
    ahead = better.count || 0;
    claimedInCity = claimed.count || 0;
  }
  const views30 = (await recentViews([l.id]))[l.id] || 0;
  const citySlug = l.city ? cityPageSlug(l.city, st) : '';

  const res = NextResponse.json({
    available: true,
    name: l.name,
    city: l.city,
    category: cat?.name || null,
    cityPage: cat && citySlug && shouldIndexCityPage(cityCount) ? `/services/${cat.slug}/${citySlug}` : null,
    views30,
    cityCount,
    rank: cityCount > 1 ? Math.min(ahead + 1, cityCount) : null,
    claimedInCity,
    rating: l.rating,
    reviewCount: l.review_count,
    missing: {
      website: !l.website,
      hours: !normalizeHours(l.hours),
      description: isBoilerplateDescription(l.description),
      phone: !l.phone,
    },
  });
  res.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res;
}
