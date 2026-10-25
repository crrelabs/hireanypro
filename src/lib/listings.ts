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
