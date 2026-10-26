import { supabase } from './supabase';

// Cache for county/city data (refreshes every 5 min via ISR)
let _countyCache: Record<string, string[]> | null = null;
let _cacheTime = 0;
// city (lowercase) -> county -> number of listings; used to pick a city's primary county (the one with most listings).
let _cityCounty: Record<string, string> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadCountyMap(): Promise<Record<string, string[]>> {
  if (_countyCache && Date.now() - _cacheTime < CACHE_TTL) return _countyCache;

  const map: Record<string, string[]> = {};

  // Paginate through all listings with county data
  let offset = 0;
  const seen = new Set<string>();
  const counts: Record<string, Record<string, number>> = {};
  while (true) {
    const { data } = await supabase
      .from('listings')
      .select('city, county')
      .not('county', 'is', null)
      .not('city', 'is', null)
      .order('id') // stable pagination: without an order, pages can skip or repeat rows
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    for (const row of data) {
      const lc = String(row.city).toLowerCase();
      (counts[lc] ??= {})[row.county] = (counts[lc][row.county] || 0) + 1;
      const key = `${row.county}|${row.city}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!map[row.county]) map[row.county] = [];
      if (!map[row.county].includes(row.city)) map[row.county].push(row.city);
    }
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Sort cities alphabetically
  for (const county of Object.keys(map)) {
    map[county].sort();
  }

  const primary: Record<string, string> = {};
  for (const [city, byCounty] of Object.entries(counts)) {
    primary[city] = Object.entries(byCounty).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }
  _cityCounty = primary;
  _countyCache = map;
  _cacheTime = Date.now();
  return map;
}

export async function getCountyMap(): Promise<Record<string, string[]>> {
  return loadCountyMap();
}

/** A city's primary county: the county where most of its listings are (e.g. Jacksonville -> Duval, not Clay). */
export async function getCountyForCity(city: string): Promise<string | null> {
  await loadCountyMap();
  return _cityCounty[city.toLowerCase()] || null;
}

export async function getCitiesInCounty(county: string): Promise<string[]> {
  const map = await loadCountyMap();
  return map[county] || [];
}

export async function getAllCounties(): Promise<string[]> {
  const map = await loadCountyMap();
  return Object.keys(map).sort();
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
