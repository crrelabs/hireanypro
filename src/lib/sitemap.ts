import { supabase } from '@/lib/supabase';
import { getAllBlogSlugs } from '@/lib/blog';
import { cityPageSlug, countySlug } from '@/lib/geo';
import { shouldIndexCityPage } from '@/lib/directory-content';
import { renderSitemapIndex, renderUrlset } from '@/lib/sitemap-xml';
import type { SitemapIndexEntry, SitemapUrl } from '@/lib/sitemap-xml';

export { renderSitemapIndex, renderUrlset };
export type { SitemapIndexEntry, SitemapUrl };

export const BASE_URL = 'https://hireanypro.com';

/** Well under Google's 50k/50MB limits and Vercel response-time budget. */
export const LISTING_CHUNK_SIZE = 5_000;

const SAFE_SLUG = /^[a-z0-9-]+$/;
const PAGE_SIZE = 1_000;
const FETCH_CONCURRENCY = 5;

type ListingGeoRow = {
  id: string;
  city: string | null;
  state?: string | null;
  county: string | null;
  category_id: string | null;
  updated_at: string | null;
};

export function toLastmod(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function maxLastmod(values: Array<string | null | undefined>): string | undefined {
  let maxMs = 0;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms;
  }
  return maxMs ? new Date(maxMs).toISOString() : undefined;
}

// Page templates were rewritten on these dates (PR #52: city + category pages; 2026-10-28: county hubs). The page content
// changed even where no listing row did, so lastmod must not be older than the rewrite or crawlers skip the new copy.
export const CITY_PAGES_REVISED = '2026-10-27';
export const CATEGORY_PAGES_REVISED = '2026-10-31'; // 2026-10-31: quote finder on category hubs
// 2026-10-31: every listing page gained an FAQ section + FAQPage markup, so listing lastmod is floored to that date.
export const LISTING_PAGES_REVISED = '2026-10-31';
export const COUNTY_PAGES_REVISED = '2026-10-28';
export function withFloor(lastmod: string | null | undefined, floor: string): string {
  return lastmod && lastmod > floor ? lastmod : floor;
}

function rememberLatest(map: Map<string, string>, key: string, lastmod?: string) {
  const current = map.get(key);
  if (current == null) {
    map.set(key, lastmod || '');
    return;
  }
  if (lastmod && lastmod > current) map.set(key, lastmod);
}

export function sitemapResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

export function sitemapErrorResponse(): Response {
  return new Response('Sitemap temporarily unavailable', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function assertOk<T>(result: { data: T | null; error: { message: string } | null }): Promise<T> {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export function parseListingChunk(raw: string): number | null {
  const normalized = raw.replace(/\.xml$/i, '');
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

export async function getListingCount(): Promise<number> {
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getLatestListingUpdatedAt(): Promise<string | undefined> {
  const data = await assertOk(
    await supabase
      .from('listings')
      .select('updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
  );
  return toLastmod(data?.[0]?.updated_at);
}

export async function getListingChunkUrls(chunk: number): Promise<SitemapUrl[]> {
  const start = chunk * LISTING_CHUNK_SIZE;
  const end = start + LISTING_CHUNK_SIZE - 1;
  const rows: { slug: string; updated_at: string | null }[] = [];

  for (let from = start; from <= end; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, end);
    const data = await assertOk(
      await supabase
        .from('listings')
        .select('slug, updated_at')
        .order('id', { ascending: true })
        .range(from, to)
    );
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < to - from + 1) break;
  }

  return rows
    .filter((row) => SAFE_SLUG.test(row.slug) && !row.slug.startsWith('zz-hap-test'))
    .map((row) => ({
      loc: `${BASE_URL}/listing/${row.slug}`,
      lastmod: withFloor(toLastmod(row.updated_at), LISTING_PAGES_REVISED),
      changefreq: 'weekly' as const,
      priority: 0.9,
    }));
}

async function fetchListingGeoRows(): Promise<ListingGeoRow[]> {
  const count = await getListingCount();
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const rows: ListingGeoRow[] = [];

  for (let page = 0; page < pageCount; page += FETCH_CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(FETCH_CONCURRENCY, pageCount - page) }, async (_, offset) => {
        const from = (page + offset) * PAGE_SIZE;
        return assertOk(
          await supabase
            .from('listings')
            .select('id, city, state, county, category_id, updated_at')
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)
        );
      })
    );

    for (const pageRows of batch) {
      if (pageRows?.length) rows.push(...pageRows);
    }
    if (batch.some((pageRows) => !pageRows || pageRows.length < PAGE_SIZE)) break;
  }

  return rows;
}

export async function getPagesSitemapUrls(): Promise<SitemapUrl[]> {
  const [categories, blogSlugs, latestListing] = await Promise.all([
    assertOk(await supabase.from('categories').select('slug, created_at').order('slug')),
    getAllBlogSlugs(),
    getLatestListingUpdatedAt(),
  ]);

  const latestCategory = maxLastmod((categories || []).map((c) => c.created_at));
  const latestBlog = maxLastmod(blogSlugs.map((b) => b.updated_at));

  const urls: SitemapUrl[] = [
    { loc: BASE_URL, lastmod: withFloor(latestListing, LISTING_PAGES_REVISED), changefreq: 'daily', priority: 1 },
    { loc: `${BASE_URL}/categories`, lastmod: latestCategory, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/pricing`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE_URL}/blog`, lastmod: latestBlog, changefreq: 'daily', priority: 0.8 },
    { loc: `${BASE_URL}/contact`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${BASE_URL}/about`, changefreq: 'yearly', priority: 0.4 },
    { loc: `${BASE_URL}/data/florida-contractor-ratings-2026`, lastmod: '2026-10-27', changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE_URL}/claim`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${BASE_URL}/for-pros`, lastmod: '2026-10-30', changefreq: 'monthly', priority: 0.6 },
  ];

  // County hub pages (/region/*) are listed once, in the cities sitemap (with per-county lastmod).

  for (const category of categories) {
    urls.push({
      loc: `${BASE_URL}/category/${category.slug}`,
      lastmod: withFloor(toLastmod(category.created_at), CATEGORY_PAGES_REVISED),
      changefreq: 'weekly',
      priority: 0.8,
    });
  }

  // Owner landing pages, one per trade (added 2026-10-30).
  for (const category of categories) {
    urls.push({ loc: `${BASE_URL}/for-pros/${category.slug}`, lastmod: '2026-10-30', changefreq: 'monthly', priority: 0.5 });
  }

  for (const post of blogSlugs) {
    urls.push({
      loc: `${BASE_URL}/blog/${post.slug}`,
      lastmod: toLastmod(post.updated_at),
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  return urls;
}

export async function getCitiesSitemapUrls(): Promise<SitemapUrl[]> {
  const [rows, catRows] = await Promise.all([
    fetchListingGeoRows(),
    assertOk(await supabase.from('categories').select('id, slug')),
  ]);

  const catIdToSlug = new Map((catRows || []).map((c) => [c.id as string, c.slug as string]));
  const cityLastmod = new Map<string, string>();
  const cityCount = new Map<string, number>();
  const countyLastmod = new Map<string, string>();

  for (const row of rows) {
    const lastmod = toLastmod(row.updated_at);
    if (row.city && row.category_id) {
      const catSlug = catIdToSlug.get(row.category_id);
      if (catSlug) {
        const key = `${catSlug}/${cityPageSlug(row.city, row.state)}`;
        cityCount.set(key, (cityCount.get(key) || 0) + 1);
        rememberLatest(cityLastmod, key, lastmod);
      }
    }
    // County hubs are Florida-only. GA/AL rows have a null county.
    if (row.county && (row.state || 'FL').trim().toUpperCase() === 'FL') {
      rememberLatest(countyLastmod, row.county, lastmod);
    }
  }

  // Pages with fewer than 3 listings are noindex. Leaving them in the sitemap spends crawl budget on thin URLs.
  const cityUrls: SitemapUrl[] = [...cityLastmod.entries()]
    .filter(([combo]) => shouldIndexCityPage(cityCount.get(combo) || 0))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([combo, lastmod]) => ({
      loc: `${BASE_URL}/services/${combo}`,
      lastmod: withFloor(lastmod, CITY_PAGES_REVISED),
      changefreq: 'weekly' as const,
      priority: 0.7,
    }));

  const countyUrls: SitemapUrl[] = [...countyLastmod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([county, lastmod]) => ({
      loc: `${BASE_URL}/region/${countySlug(county)}`,
      lastmod: withFloor(lastmod, COUNTY_PAGES_REVISED),
      changefreq: 'weekly' as const,
      priority: 0.7,
    }));

  return [...cityUrls, ...countyUrls];
}

export function listingSitemapPath(chunk: number): string {
  return `${BASE_URL}/sitemap/listings/${chunk}.xml`;
}

export function buildSitemapIndexEntries(
  listingCount: number,
  latestListing?: string
): SitemapIndexEntry[] {
  const listingChunks = Math.ceil(listingCount / LISTING_CHUNK_SIZE);
  const entries: SitemapIndexEntry[] = [
    { loc: `${BASE_URL}/sitemap/pages.xml`, lastmod: withFloor(latestListing, CATEGORY_PAGES_REVISED) },
    { loc: `${BASE_URL}/sitemap/cities.xml`, lastmod: withFloor(latestListing, COUNTY_PAGES_REVISED) },
  ];

  for (let chunk = 0; chunk < listingChunks; chunk++) {
    entries.push({ loc: listingSitemapPath(chunk), lastmod: withFloor(latestListing, LISTING_PAGES_REVISED) });
  }

  return entries;
}

export async function getSitemapIndexEntries(): Promise<SitemapIndexEntry[]> {
  const [listingCount, latestListing] = await Promise.all([
    getListingCount(),
    getLatestListingUpdatedAt(),
  ]);
  return buildSitemapIndexEntries(listingCount, latestListing);
}
