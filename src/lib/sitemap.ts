import { supabase } from '@/lib/supabase';
import { getAllBlogSlugs } from '@/lib/blog';
import { citySlug, countySlug } from '@/lib/geo';
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
    .filter((row) => SAFE_SLUG.test(row.slug))
    .map((row) => ({
      loc: `${BASE_URL}/listing/${row.slug}`,
      lastmod: toLastmod(row.updated_at),
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
            .select('id, city, county, category_id, updated_at')
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
    { loc: BASE_URL, lastmod: latestListing, changefreq: 'daily', priority: 1 },
    { loc: `${BASE_URL}/categories`, lastmod: latestCategory, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/pricing`, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE_URL}/blog`, lastmod: latestBlog, changefreq: 'daily', priority: 0.8 },
  ];

  for (const category of categories) {
    urls.push({
      loc: `${BASE_URL}/category/${category.slug}`,
      lastmod: toLastmod(category.created_at),
      changefreq: 'weekly',
      priority: 0.8,
    });
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
  const countyLastmod = new Map<string, string>();

  for (const row of rows) {
    const lastmod = toLastmod(row.updated_at);
    if (row.city && row.category_id) {
      const catSlug = catIdToSlug.get(row.category_id);
      if (catSlug) {
        rememberLatest(cityLastmod, `${catSlug}/${citySlug(row.city)}`, lastmod);
      }
    }
    if (row.county) {
      rememberLatest(countyLastmod, row.county, lastmod);
    }
  }

  const cityUrls: SitemapUrl[] = [...cityLastmod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([combo, lastmod]) => ({
      loc: `${BASE_URL}/services/${combo}`,
      lastmod: lastmod || undefined,
      changefreq: 'weekly' as const,
      priority: 0.7,
    }));

  const countyUrls: SitemapUrl[] = [...countyLastmod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([county, lastmod]) => ({
      loc: `${BASE_URL}/region/${countySlug(county)}`,
      lastmod: lastmod || undefined,
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
    { loc: `${BASE_URL}/sitemap/pages.xml`, lastmod: latestListing },
    { loc: `${BASE_URL}/sitemap/cities.xml`, lastmod: latestListing },
  ];

  for (let chunk = 0; chunk < listingChunks; chunk++) {
    entries.push({ loc: listingSitemapPath(chunk), lastmod: latestListing });
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
