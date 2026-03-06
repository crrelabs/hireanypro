import { supabase } from './supabase';

// Cache for county/city data (refreshes every 5 min via ISR)
let _countyCache: Record<string, string[]> | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadCountyMap(): Promise<Record<string, string[]>> {
  if (_countyCache && Date.now() - _cacheTime < CACHE_TTL) return _countyCache;

  const map: Record<string, string[]> = {};

  // Paginate through all listings with county data
  let offset = 0;
  const seen = new Set<string>();
  while (true) {
    const { data } = await supabase
      .from('listings')
      .select('city, county')
      .not('county', 'is', null)
      .not('city', 'is', null)
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    for (const row of data) {
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

  _countyCache = map;
  _cacheTime = Date.now();
  return map;
}

export async function getCountyMap(): Promise<Record<string, string[]>> {
  return loadCountyMap();
}

export async function getCountyForCity(city: string): Promise<string | null> {
  const map = await loadCountyMap();
  for (const [county, cities] of Object.entries(map)) {
    if (cities.some(c => c.toLowerCase() === city.toLowerCase())) return county;
  }
  return null;
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
