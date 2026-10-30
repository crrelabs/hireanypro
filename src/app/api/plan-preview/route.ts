import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { shouldIndexCityPage } from '@/lib/directory-content';
import { cityPageSlug, stateCode } from '@/lib/geo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,200}$/;

/**
 * "Your spot in {city}" facts for an owner on /pricing: where the business ranks among same-category pros in its
 * city by Google review count, and how many of those pros are on Pro or Featured (paid listings sort first on city
 * pages: Featured, then Pro, then free). Everything here is already public on the city page; no view counts or
 * private data, so it works for claimed listings too.
 */
export async function GET(req: NextRequest) {
  if (isRateLimited(`plan-preview:${getClientIp(req)}`, 30)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const key = (req.nextUrl.searchParams.get('listing') || '').trim();
  if (!UUID.test(key) && !SLUG.test(key)) return NextResponse.json({ error: 'bad_listing' }, { status: 400 });

  const { data: l, error } = await supabase
    .from('listings')
    .select('id, slug, name, city, state, category_id, review_count, tier, featured, categories(name, slug)')
    .eq(UUID.test(key) ? 'id' : 'slug', key)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  if (!l || l.slug.startsWith('zz-hap-test') || !l.city || !l.category_id) return NextResponse.json({ available: false });

  const cat = (Array.isArray(l.categories) ? l.categories[0] : l.categories) as { name: string; slug: string } | null;
  const st = stateCode(l.state);
  const base = () => supabase.from('listings').select('id', { count: 'exact', head: true })
    .eq('category_id', l.category_id).eq('city', l.city).eq('state', st).not('slug', 'like', 'zz-hap-test%');
  const [all, better, pro, featured] = await Promise.all([
    base(),
    base().gt('review_count', l.review_count || 0),
    base().eq('tier', 'pro'),
    base().or('featured.eq.true,tier.eq.featured'),
  ]);
  if (all.error || better.error || pro.error || featured.error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const cityCount = all.count || 0;
  const citySlug = cityPageSlug(l.city, st);

  const res = NextResponse.json({
    available: true,
    name: l.name,
    city: l.city,
    category: cat?.name || null,
    cityPage: cat && shouldIndexCityPage(cityCount) ? `/services/${cat.slug}/${citySlug}` : null,
    cityCount,
    rank: cityCount > 1 ? Math.min((better.count || 0) + 1, cityCount) : null,
    proCount: pro.count || 0,
    featuredCount: featured.count || 0,
    tier: l.featured ? 'featured' : l.tier || 'free',
  });
  res.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res;
}
