import { cache } from 'react';
import { costGuide, costPath, COST_GUIDES, type CostGuide } from '@/lib/cost-guides';
import { getHubCities, getHubCity, type HubCity } from '@/lib/city-hubs';
import { computeCityStats, shouldIndexCityPage } from '@/lib/directory-content';
import { getCategoryBySlug } from '@/lib/listings';
import { fetchOrderedPages } from '@/lib/paged-read';
import { cityAliasCandidates, tradeAlias } from '@/lib/slug-aliases';
import { supabase } from '@/lib/supabase';

/**
 * City cost answer pages: /costs/<trade>/<city>.
 *
 * A page exists only when all of these are true:
 * - trade is a COST_GUIDES slug (or a tradeAlias that maps to one)
 * - city is a Florida hub from getHubCities() (same hub rule as /cities/<city>)
 * - that city has at least MIN_INDEXABLE_CITY_LISTINGS in the trade (same threshold as /services/<cat>/<city>)
 *
 * Non-Florida hubs are not cost pages. The dollar ranges are Florida planning estimates;
 * publishing them as a Valdosta or other out-of-state price would be a fake local number.
 *
 * Redirects (308), when the trade is known:
 * - city is not a Florida hub, or the combo is under the listing threshold → /costs/<trade>
 * - requested slug is a trade or city alias of a page that does exist → the canonical /costs/<trade>/<city>
 * Unknown trade (not a guide and not an alias) → 404.
 */
export const CITY_COST_PAGES_REVISED = '2026-11-05';

export const costCityPath = (trade: string, city: string) => `${costPath(trade)}/${city}`;

export function canonicalCostTrade(slug: string): string | null {
  const s = slug.toLowerCase();
  return costGuide(s)?.slug || costGuide(tradeAlias(s) || '')?.slug || null;
}

export function cityCostPageAllowed(input: { hasGuide: boolean; isHub: boolean; state: string; count: number }): boolean {
  return input.hasGuide && input.isHub && input.state === 'FL' && shouldIndexCityPage(input.count);
}

export type CityCostDecision =
  | { type: 'not-found' }
  | { type: 'redirect'; href: string }
  | { type: 'render' };

/**
 * Pure redirect/render decision. `liveCount`, when set, is the listing count just read for the page;
 * the hub index count is `hub.count`. Both have to clear the indexable threshold.
 */
export function decideCityCost(input: {
  tradeSlug: string;
  guide: boolean;
  hub: { slug: string; state: string; count: number } | null;
  requestedCity: string;
  liveCount?: number;
}): CityCostDecision {
  if (!input.guide) return { type: 'not-found' };
  const fallback = costPath(input.tradeSlug);
  if (!input.hub || !cityCostPageAllowed({ hasGuide: true, isHub: true, state: input.hub.state, count: input.hub.count })) {
    return { type: 'redirect', href: fallback };
  }
  if (input.hub.slug !== input.requestedCity) {
    return { type: 'redirect', href: costCityPath(input.tradeSlug, input.hub.slug) };
  }
  if (input.liveCount !== undefined && !shouldIndexCityPage(input.liveCount)) {
    return { type: 'redirect', href: fallback };
  }
  return { type: 'render' };
}

export type CityCostCountSource = {
  slug: string;
  name: string;
  state: string;
  byCategory: Record<string, number>;
};

export type CityCostPair = {
  trade: string;
  city: string;
  name: string;
  state: string;
  count: number;
};

/** Every indexable Florida hub × cost-guide pair. Sorted for stable sitemap and chip output. */
export function eligibleCityCosts(
  hubs: Iterable<CityCostCountSource>,
  categoryIdBySlug: ReadonlyMap<string, string>,
): CityCostPair[] {
  const out: CityCostPair[] = [];
  for (const guide of COST_GUIDES) {
    const categoryId = categoryIdBySlug.get(guide.slug);
    if (!categoryId) continue;
    for (const hub of hubs) {
      const count = hub.byCategory[categoryId] || 0;
      if (!cityCostPageAllowed({ hasGuide: true, isHub: true, state: hub.state, count })) continue;
      out.push({ trade: guide.slug, city: hub.slug, name: hub.name, state: hub.state, count });
    }
  }
  return out.sort((a, b) => a.trade.localeCompare(b.trade) || b.count - a.count || a.city.localeCompare(b.city));
}

export type CityCostFacts = {
  count: number;
  /** Review-weighted average (same formula as city pages). Null when nothing is rated. */
  avg: number | null;
  reviews: number;
  rated: number;
};

export type CityCostResolved =
  | { status: 'not-found' }
  | { status: 'redirect'; href: string }
  | {
      status: 'ok';
      guide: CostGuide;
      hub: HubCity;
      category: { id: string; name: string; slug: string };
      facts: CityCostFacts;
    };

async function matchingHub(citySlug: string): Promise<HubCity | null> {
  const exact = await getHubCity(citySlug);
  if (exact) return exact;
  for (const candidate of cityAliasCandidates(citySlug)) {
    const hub = await getHubCity(candidate);
    if (hub) return hub;
  }
  return null;
}

async function loadCityCostFacts(categoryId: string, hub: HubCity): Promise<CityCostFacts> {
  const cities = [...new Set(hub.variants.map((v) => v.trim()).filter(Boolean))];
  if (!cities.length) return { count: 0, avg: null, reviews: 0, rated: 0 };
  const rows = await fetchOrderedPages<{ slug: string; rating: number | null; review_count: number | null }>({
    label: `city cost ${hub.slug}`,
    count: () => supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .in('city', cities)
      .eq('state', hub.state),
    page: (from, to) => supabase
      .from('listings')
      // name is required: computeCityStats ignores rows that have no name, which would drop the average.
      .select('name, slug, rating, review_count')
      .eq('category_id', categoryId)
      .in('city', cities)
      .eq('state', hub.state)
      .order('id')
      .range(from, to),
  });
  const stats = computeCityStats(rows.filter((row) => !row.slug.startsWith('zz-hap-test')));
  return {
    count: stats.shown,
    avg: stats.rated > 0 ? stats.avg : null,
    reviews: stats.totalReviews,
    rated: stats.rated,
  };
}

async function resolveCityCostUncached(tradeSlug: string, citySlug: string): Promise<CityCostResolved> {
  const canonical = canonicalCostTrade(tradeSlug);
  if (!canonical) return { status: 'not-found' };
  const guide = costGuide(canonical);
  if (!guide) return { status: 'not-found' };
  const requestedCity = citySlug.toLowerCase();
  const [category, hub] = await Promise.all([
    getCategoryBySlug(canonical),
    matchingHub(requestedCity),
  ]);
  const hubCount = category && hub ? hub.byCategory[category.id] || 0 : 0;
  const decision = decideCityCost({
    tradeSlug: canonical,
    guide: true,
    hub: hub ? { slug: hub.slug, state: hub.state, count: hubCount } : null,
    requestedCity,
  });
  if (decision.type === 'not-found') return { status: 'not-found' };
  if (decision.type === 'redirect') return { status: 'redirect', href: decision.href };
  if (!category || !hub) return { status: 'redirect', href: costPath(canonical) };
  if (tradeSlug.toLowerCase() !== canonical) {
    return { status: 'redirect', href: costCityPath(canonical, hub.slug) };
  }
  const facts = await loadCityCostFacts(category.id, hub);
  const live = decideCityCost({
    tradeSlug: canonical,
    guide: true,
    hub: { slug: hub.slug, state: hub.state, count: hubCount },
    requestedCity,
    liveCount: facts.count,
  });
  if (live.type !== 'render') return { status: 'redirect', href: costPath(canonical) };
  return { status: 'ok', guide, hub, category, facts };
}

/** One resolution per request (metadata + page share it). */
export const resolveCityCost = cache(resolveCityCostUncached);

export async function cityCostCitiesForTrade(tradeSlug: string): Promise<CityCostPair[]> {
  const canonical = canonicalCostTrade(tradeSlug);
  if (!canonical || canonical !== tradeSlug) return [];
  const [hubs, category] = await Promise.all([getHubCities(), getCategoryBySlug(canonical)]);
  if (!category) return [];
  return eligibleCityCosts(hubs, new Map([[canonical, category.id]])).filter((pair) => pair.trade === canonical);
}
