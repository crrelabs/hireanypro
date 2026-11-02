import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';
import { cityPageSlug, stateCode } from './geo';
import { fetchOrderedPages, shareInflight } from './paged-read';
import { MIN_INDEXABLE_CITY_LISTINGS } from './directory-content';

/**
 * City hub pages (/cities/<slug>): every service in one city. A city gets a hub only when at least
 * MIN_HUB_TRADES services there have an indexable page (3+ listings each), so hubs are never thin.
 * The sitemap (getCitiesSitemapUrls) and page_numbers_check.py use the same rule.
 */
export const MIN_HUB_TRADES = 3;

export type HubCity = {
  slug: string;
  name: string;
  state: string;
  /** Raw spellings in the data ("Miami", "miami"), for .in('city', variants). */
  variants: string[];
  total: number;
  /** category_id -> listings in this city. */
  byCategory: Record<string, number>;
  /** Services with an indexable page here. */
  indexableTrades: number;
};

export function isHubCity(byCategoryCounts: number[]): boolean {
  return byCategoryCounts.filter((n) => n >= MIN_INDEXABLE_CITY_LISTINGS).length >= MIN_HUB_TRADES;
}

type Row = { city: string | null; state: string | null; category_id: string | null; slug: string };

const loadHubIndex = unstable_cache(async (): Promise<HubCity[]> => {
  const rows = await fetchOrderedPages<Row>({
    label: 'city hub index',
    count: () => supabase.from('listings').select('id', { count: 'exact', head: true }).not('city', 'is', null),
    page: (from, to) => supabase
      .from('listings')
      .select('city, state, category_id, slug')
      .not('city', 'is', null)
      .order('id')
      .range(from, to),
  });
  const groups = new Map<string, { names: Map<string, number>; state: string; total: number; byCategory: Record<string, number> }>();
  for (const r of rows) {
    const name = (r.city || '').trim();
    if (!name || !r.category_id || r.slug.startsWith('zz-hap-test')) continue;
    const state = stateCode(r.state);
    const slug = cityPageSlug(name, state);
    if (!slug) continue;
    const g = groups.get(slug) || { names: new Map<string, number>(), state, total: 0, byCategory: {} };
    g.names.set(r.city as string, (g.names.get(r.city as string) || 0) + 1);
    g.total += 1;
    g.byCategory[r.category_id] = (g.byCategory[r.category_id] || 0) + 1;
    groups.set(slug, g);
  }
  const out: HubCity[] = [];
  for (const [slug, g] of groups) {
    const counts = Object.values(g.byCategory);
    if (!isHubCity(counts)) continue;
    const name = [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0].trim();
    out.push({
      slug, name, state: g.state, variants: [...g.names.keys()], total: g.total, byCategory: g.byCategory,
      indexableTrades: counts.filter((n) => n >= MIN_INDEXABLE_CITY_LISTINGS).length,
    });
  }
  return out.sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug));
}, ['city-hub-index-v1'], { revalidate: 3600 });

const inflight = new Map<string, Promise<HubCity[]>>();

/** All hub cities, largest first. Cached for an hour across instances. */
export function getHubCities(): Promise<HubCity[]> {
  return shareInflight(inflight, 'hubs', () => loadHubIndex());
}

export async function getHubCity(slug: string): Promise<HubCity | null> {
  return (await getHubCities()).find((c) => c.slug === slug) || null;
}

/** Set of hub slugs, for "link the hub if there is one" decisions. */
export async function getHubSlugs(): Promise<Set<string>> {
  return new Set((await getHubCities()).map((c) => c.slug));
}

export const hubHref = (slug: string) => `/cities/${slug}`;
