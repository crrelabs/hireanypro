import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabase, type Listing } from './supabase';
import { cityPageSlug, stateCode } from './geo';

/** Only the columns a ListingCard needs, so list pages don't ship every listing's full record to the browser. */
export const CARD_COLUMNS =
  'id, name, slug, city, state, zip, rating, review_count, tier, featured, lat, lng, phone, categories(name, slug, icon)';

export type CardListing = Listing & { categories?: { name: string; slug: string; icon: string } };

/** Free listings don't show a phone number on cards, so don't send it to the client either. */
export function toCard<T extends { tier?: string | null; phone?: string | null }>(l: T): T {
  const paid = l.tier === 'pro' || l.tier === 'featured';
  return paid ? l : { ...l, phone: null };
}

export type CityGroup = { name: string; slug: string; variants: string[]; count: number; state: string };

/**
 * Every city in a category with its listing count, grouped by URL slug (so "Miami" and "miami" are one page).
 * Paginates past Supabase's 1,000-row default so large categories are complete. Memoized per request.
 */
const loadCategoryCities = unstable_cache(async (categoryId: string): Promise<CityGroup[]> => {
  const groups = new Map<string, { names: Map<string, number>; count: number; state: string }>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('city, state')
      .eq('category_id', categoryId)
      .not('city', 'is', null)
      .order('id')
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      const name = (row.city || '').trim();
      if (!name) continue;
      // Out-of-state (near-border GA/AL) cities get their own "-ga"/"-al" page, never merged into a Florida namesake.
      const state = stateCode(row.state);
      const slug = cityPageSlug(name, state);
      if (!slug) continue;
      const g = groups.get(slug) || { names: new Map<string, number>(), count: 0, state };
      g.names.set(row.city, (g.names.get(row.city) || 0) + 1);
      g.count += 1;
      groups.set(slug, g);
    }
    if (data.length < 1000) break;
  }
  return [...groups.entries()].map(([slug, g]) => {
    const variants = [...g.names.keys()];
    // Display the most common spelling (e.g. "Miami" over "miami").
    const name = [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0].trim();
    return { name, slug, variants, count: g.count, state: g.state };
  });
}, ['category-cities-v2'], { revalidate: 3600 });

export const getCategoryCities = cache((categoryId: string) => loadCategoryCities(categoryId));

export const getCategoryBySlug = cache(async (slug: string) => {
  const { data } = await supabase.from('categories').select('*').eq('slug', slug).single();
  return data as { id: string; name: string; slug: string; icon: string } | null;
});

/** Card columns plus the fields city-page stats need. Hours and website stay on the server. */
export const CITY_PAGE_COLUMNS = `${CARD_COLUMNS}, website, hours, claimed`;

export type CityPageRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  rating: number | null;
  review_count: number | null;
  tier: string | null;
  featured: boolean | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  hours: unknown;
  claimed: boolean | null;
  categories?: { name: string; slug: string; icon: string } | { name: string; slug: string; icon: string }[] | null;
};

function compareCityPageRows(a: CityPageRow, b: CityPageRow): number {
  const featured = Number(!!b.featured) - Number(!!a.featured);
  if (featured) return featured;
  const tier = String(b.tier || '').localeCompare(String(a.tier || ''));
  if (tier) return tier;
  const reviews = Number(b.review_count ?? -1) - Number(a.review_count ?? -1);
  if (reviews) return reviews;
  return Number(b.rating ?? -1) - Number(a.rating ?? -1);
}

/**
 * Listings for one category + city + state. Paginates when the city has more than 500 so stats are not capped
 * by PostgREST's default. The common path keeps the existing sort and a single query.
 */
export const getCityPageRows = cache(async (
  categoryId: string,
  variants: string[],
  state: string,
  totalHint: number,
): Promise<CityPageRow[]> => {
  const cities = [...new Set(variants.map((v) => v.trim()).filter(Boolean))];
  const st = stateCode(state);
  if (!cities.length) return [];
  if (totalHint > 500) {
    const all: CityPageRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from('listings')
        .select(CITY_PAGE_COLUMNS)
        .eq('category_id', categoryId)
        .in('city', cities)
        .eq('state', st)
        .order('id')
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      all.push(...(data as CityPageRow[]));
      if (data.length < 1000) break;
    }
    all.sort(compareCityPageRows);
    return all;
  }
  const { data, error } = await supabase
    .from('listings')
    .select(CITY_PAGE_COLUMNS)
    .eq('category_id', categoryId)
    .in('city', cities)
    .eq('state', st)
    .order('featured', { ascending: false })
    .order('tier', { ascending: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []) as CityPageRow[];
});

export type SiblingCategory = { name: string; slug: string; count: number };

function categoryEmbed(value: unknown): { name: string; slug: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const cat = row as { name?: string; slug?: string };
  if (!cat.name || !cat.slug) return null;
  return { name: cat.name, slug: cat.slug };
}

const loadSiblingCategories = unstable_cache(async (
  variantsKey: string,
  state: string,
  excludeCategoryId: string,
): Promise<SiblingCategory[]> => {
  const cities = variantsKey.split('\n').map((v) => v.trim()).filter(Boolean);
  if (!cities.length) return [];
  const counts = new Map<string, SiblingCategory>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('category_id, categories(name, slug)')
      .in('city', cities)
      .eq('state', state)
      .neq('category_id', excludeCategoryId)
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      const cat = categoryEmbed(row.categories);
      if (!cat) continue;
      const current = counts.get(cat.slug) || { name: cat.name, slug: cat.slug, count: 0 };
      current.count += 1;
      counts.set(cat.slug, current);
    }
    if (data.length < 1000) break;
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}, ['city-sibling-categories-v1'], { revalidate: 3600 });

/** Other categories that have listings in this city and state, with counts. */
export const getCitySiblingCategories = cache((variants: string[], state: string, excludeCategoryId: string) => {
  const key = [...new Set(variants.map((v) => v.trim()).filter(Boolean))].sort().join('\n');
  return loadSiblingCategories(key, stateCode(state), excludeCategoryId);
});

export type CountyCityCount = { name: string; slug: string; count: number };
export type CountyCount = { county: string; count: number; cities: CountyCityCount[] };

export type CategoryRollup = {
  total: number;
  byState: { FL: number; GA: number; AL: number };
  rated: number;
  totalReviews: number;
  avg: number;
  withPhone: number;
  withWebsite: number;
  counties: CountyCount[];
};

type RollupRow = {
  city: string | null;
  county: string | null;
  rating: number | null;
  review_count: number | null;
  phone: string | null;
  website: string | null;
};

async function fetchCategoryStateRows(categoryId: string, state: string): Promise<RollupRow[]> {
  const rows: RollupRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('city, county, rating, review_count, phone, website')
      .eq('category_id', categoryId)
      .eq('state', state)
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...(data as RollupRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

function absorbRollup(target: { rated: number; totalReviews: number; weighted: number; withPhone: number; withWebsite: number }, rows: RollupRow[]) {
  for (const row of rows) {
    if (typeof row.phone === 'string' && row.phone.trim()) target.withPhone += 1;
    if (typeof row.website === 'string' && row.website.trim()) target.withWebsite += 1;
    const rating = Number(row.rating || 0);
    const reviews = Number(row.review_count || 0);
    if (rating > 0 && reviews > 0) {
      target.rated += 1;
      target.totalReviews += reviews;
      target.weighted += rating * reviews;
    }
  }
}

const loadCategoryRollup = unstable_cache(async (categoryId: string): Promise<CategoryRollup> => {
  const [fl, ga, al] = await Promise.all([
    fetchCategoryStateRows(categoryId, 'FL'),
    fetchCategoryStateRows(categoryId, 'GA'),
    fetchCategoryStateRows(categoryId, 'AL'),
  ]);
  const agg = { rated: 0, totalReviews: 0, weighted: 0, withPhone: 0, withWebsite: 0 };
  absorbRollup(agg, fl);
  absorbRollup(agg, ga);
  absorbRollup(agg, al);

  const counties = new Map<string, { count: number; cities: Map<string, { names: Map<string, number>; count: number }> }>();
  for (const row of fl) {
    const county = (row.county || '').trim();
    if (!county) continue;
    const bucket = counties.get(county) || { count: 0, cities: new Map() };
    bucket.count += 1;
    const cityName = (row.city || '').trim();
    if (cityName) {
      const slug = cityPageSlug(cityName, 'FL');
      if (slug) {
        const city = bucket.cities.get(slug) || { names: new Map<string, number>(), count: 0 };
        city.names.set(cityName, (city.names.get(cityName) || 0) + 1);
        city.count += 1;
        bucket.cities.set(slug, city);
      }
    }
    counties.set(county, bucket);
  }

  return {
    total: fl.length + ga.length + al.length,
    byState: { FL: fl.length, GA: ga.length, AL: al.length },
    rated: agg.rated,
    totalReviews: agg.totalReviews,
    avg: agg.totalReviews ? agg.weighted / agg.totalReviews : 0,
    withPhone: agg.withPhone,
    withWebsite: agg.withWebsite,
    counties: [...counties.entries()]
      .map(([county, bucket]) => ({
        county,
        count: bucket.count,
        cities: [...bucket.cities.entries()]
          .map(([slug, city]) => ({
            slug,
            count: city.count,
            name: [...city.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
          .slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count || a.county.localeCompare(b.county)),
  };
}, ['category-rollup-v1'], { revalidate: 3600 });

/** Statewide counts for a category hub: ratings, contact coverage, and Florida counties. One query per state. */
export const getCategoryRollup = cache((categoryId: string) => loadCategoryRollup(categoryId));

export type CitySnapshot = {
  count: number;
  name: string;
  slug: string;
  state: string;
  rated: number;
  totalReviews: number;
  avg: number;
  peers: { name: string; slug: string; rating: number; reviewCount: number }[];
};

/** Count and rating stats for one category in one city, filtered by state. Used to give thin listings local context. */
export const getCityCategorySnapshot = cache(async (
  categoryId: string,
  city: string,
  state: string | null,
  excludeSlug: string,
): Promise<CitySnapshot | null> => {
  const st = stateCode(state);
  const groups = await getCategoryCities(categoryId);
  const group = groups.find((g) => g.state === st && g.variants.some((v) => v.trim().toLowerCase() === city.trim().toLowerCase()));
  if (!group) return null;
  const rows: { slug: string; name: string | null; rating: number | null; review_count: number | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('slug, name, rating, review_count')
      .eq('category_id', categoryId)
      .eq('state', st)
      .in('city', group.variants)
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  let rated = 0;
  let totalReviews = 0;
  let weighted = 0;
  const peers: CitySnapshot['peers'] = [];
  for (const row of rows) {
    const rating = Number(row.rating || 0);
    const reviewCount = Number(row.review_count || 0);
    if (rating > 0 && reviewCount > 0) {
      rated += 1;
      totalReviews += reviewCount;
      weighted += rating * reviewCount;
    }
    if (row.slug && row.slug !== excludeSlug && row.name) {
      peers.push({ name: row.name, slug: row.slug, rating, reviewCount });
    }
  }
  peers.sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating || a.name.localeCompare(b.name));
  return {
    count: group.count,
    name: group.name,
    slug: group.slug,
    state: group.state,
    rated,
    totalReviews,
    avg: totalReviews ? weighted / totalReviews : 0,
    peers: peers.slice(0, 3),
  };
});
