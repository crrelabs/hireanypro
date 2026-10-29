import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';
import { fetchOrderedPages, shareInflight } from './paged-read';

/**
 * Florida county map. Cached in Next's data cache (shared across serverless instances) and deduped
 * in-flight so one instance never runs two scans. The cached value is the aggregated city/county
 * pairs, not the ~27k raw rows, so it stays well under the 2 MB cache item limit.
 * Primary county = the county with the most listings for that city; ties break by county name.
 * A failed page throws, so a partial map is never cached.
 */
export type CountyMapData = {
  /** County -> city names (exact spellings, sorted). */
  byCounty: Record<string, string[]>;
  /** Lowercase city -> primary county. */
  primary: Record<string, string>;
};

type CountyRow = { city: string; county: string };

function buildCountyMap(rows: CountyRow[]): CountyMapData {
  const byCounty: Record<string, string[]> = {};
  const seen = new Set<string>();
  const counts: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    const lc = String(row.city).toLowerCase();
    (counts[lc] ??= {})[row.county] = (counts[lc][row.county] || 0) + 1;
    const key = `${row.county}|${row.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!byCounty[row.county]) byCounty[row.county] = [];
    if (!byCounty[row.county].includes(row.city)) byCounty[row.county].push(row.city);
  }

  for (const county of Object.keys(byCounty)) {
    byCounty[county].sort();
  }

  const primary: Record<string, string> = {};
  for (const [city, byName] of Object.entries(counts)) {
    primary[city] = Object.entries(byName).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }
  return { byCounty, primary };
}

async function scanCountyRows(): Promise<CountyRow[]> {
  const filters = () => supabase
    .from('listings')
    .select('city, county')
    .eq('state', 'FL') // county pages are Florida-only; GA/AL listings have no county
    .not('county', 'is', null)
    .not('city', 'is', null);

  return fetchOrderedPages<CountyRow>({
    label: 'county map',
    count: () => supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'FL')
      .not('county', 'is', null)
      .not('city', 'is', null),
    page: async (from, to) => {
      const { data, error } = await filters().order('id').range(from, to);
      return { data: (data || null) as CountyRow[] | null, error };
    },
  });
}

const readCountyMap = unstable_cache(async (): Promise<CountyMapData> => {
  const rows = await scanCountyRows();
  const map = buildCountyMap(rows);
  // Refuse to cache an unexpectedly huge payload (Next drops data-cache entries over 2 MB).
  const bytes = JSON.stringify(map).length;
  if (bytes > 1_500_000) throw new Error(`county map cache entry is ${bytes} bytes`);
  return map;
}, ['fl-county-map-v1'], { revalidate: 3600 });

const countyInflight = new Map<string, Promise<CountyMapData>>();

function loadCountyMap(): Promise<CountyMapData> {
  return shareInflight(countyInflight, 'fl', () => readCountyMap());
}

export async function getCountyData(): Promise<CountyMapData> {
  return loadCountyMap();
}

/** Cities listed in this county whose primary county is this one (sorted). */
export function primaryCitiesInCounty(data: CountyMapData, county: string): string[] {
  return (data.byCounty[county] || []).filter((name) => data.primary[name.toLowerCase()] === county);
}

export async function getCountyMap(): Promise<Record<string, string[]>> {
  return (await loadCountyMap()).byCounty;
}

/** A city's primary county: the county where most of its listings are (e.g. Jacksonville -> Duval, not Clay). */
export async function getCountyForCity(city: string): Promise<string | null> {
  const map = await loadCountyMap();
  return map.primary[city.toLowerCase()] || null;
}

export async function getCitiesInCounty(county: string): Promise<string[]> {
  const map = await loadCountyMap();
  return map.byCounty[county] || [];
}

export async function getPrimaryCitiesInCounty(county: string): Promise<string[]> {
  return primaryCitiesInCounty(await loadCountyMap(), county);
}

export async function getAllCounties(): Promise<string[]> {
  const map = await loadCountyMap();
  return Object.keys(map.byCounty).sort();
}

export function countySlug(county: string): string {
  return county.toLowerCase().replace(/\s+/g, '-');
}

export function countyFromSlug(slug: string, counties: string[]): string | null {
  return counties.find(c => countySlug(c) === slug) || null;
}

export function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function cityFromSlug(slug: string, cities: string[]): string | null {
  return cities.find(c => citySlug(c) === slug) || null;
}

const STATE_NAMES: Record<string, string> = { FL: 'Florida', GA: 'Georgia', AL: 'Alabama' };

/** Two-letter state for a listing; defaults to FL (most of the directory). */
export function stateCode(state?: string | null): string {
  const s = (state || 'FL').trim().toUpperCase();
  return s || 'FL';
}

/** Full state name, e.g. "Georgia" for near-border GA listings. */
export function stateName(state?: string | null): string {
  const c = stateCode(state);
  return STATE_NAMES[c] || c;
}

/**
 * City page slug. Florida cities keep their plain slug ("lake-park"); out-of-state cities get a state
 * suffix ("lake-park-ga") so they never merge into a Florida city with the same name.
 */
export function cityPageSlug(city: string, state?: string | null): string {
  const base = citySlug(city);
  const c = stateCode(state);
  return c === 'FL' || !base ? base : `${base}-${c.toLowerCase()}`;
}
