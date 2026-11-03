import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const SLUG = /^[a-z0-9-]{1,200}$/;
const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATES = ['FL', 'GA', 'AL'] as const;
const COLUMNS = 'id, name, slug, city, state, tier, claimed, categories(name)';

export type ClaimListingHit = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  tier: string | null;
  claimed: boolean;
  categories: { name: string } | null;
};

function categoryName(value: unknown): { name: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const name = (row as { name?: unknown }).name;
  return typeof name === 'string' && name ? { name } : null;
}

function toHit(row: {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  tier?: string | null;
  claimed: boolean | null;
  categories: unknown;
}): ClaimListingHit {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city || '',
    state: row.state || '',
    tier: row.tier ?? null,
    claimed: !!row.claimed,
    categories: categoryName(row.categories),
  };
}

const listingBySlug = unstable_cache(async (slug: string): Promise<ClaimListingHit | null> => {
  const { data, error } = await supabase
    .from('listings')
    .select(COLUMNS)
    .eq('slug', slug)
    .in('state', STATES)
    .not('slug', 'like', 'zz-hap-test%')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toHit(data) : null;
}, ['claim-listing-by-slug-v2'], { revalidate: 120 });

// /pricing deep links pass an id or a slug and used to read the row in the browser with no state filter.
const listingByColumn = unstable_cache(async (column: 'id' | 'slug', key: string): Promise<ClaimListingHit | null> => {
  const { data, error } = await supabase
    .from('listings')
    .select(COLUMNS)
    .eq(column, key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toHit(data) : null;
}, ['claim-listing-by-column-v1'], { revalidate: 120 });

const searchListings = unstable_cache(async (name: string, city: string): Promise<ClaimListingHit[]> => {
  let req = supabase
    .from('listings')
    .select(COLUMNS)
    .ilike('name', `%${name}%`)
    .in('state', STATES)
    .not('slug', 'like', 'zz-hap-test%')
    .order('review_count', { ascending: false, nullsFirst: false })
    .limit(10);
  if (city) req = req.ilike('city', `${city}%`);
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => toHit(row));
}, ['claim-listing-search-v2'], { revalidate: 60 });

// Homepage finder and /pricing typeahead. Same filters as the old browser queries: no state filter,
// test slugs excluded, best-known match first, 8 rows.
const searchDirectory = unstable_cache(async (name: string, city: string): Promise<ClaimListingHit[]> => {
  let req = supabase
    .from('listings')
    .select(COLUMNS)
    .ilike('name', `%${name}%`)
    .not('slug', 'like', 'zz-hap-test%')
    .order('review_count', { ascending: false, nullsFirst: false })
    .limit(8);
  if (city) req = req.ilike('city', `${city}%`);
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => toHit(row));
}, ['claim-listing-directory-v1'], { revalidate: 60 });

function json(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  if (status === 200) res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
}

/**
 * Read-only listing lookup. The signed one-click token (ct) is not accepted here and must not be logged.
 * ?slug= one row for /claim (FL/GA/AL, no test rows).
 * ?listing= one row for /pricing (id or slug).
 * ?q= claim-form search (FL/GA/AL, 10 rows). ?q=&scope=directory is the homepage finder and /pricing typeahead (8 rows).
 */
export async function GET(req: NextRequest) {
  if (isRateLimited(`claim-listings:${getClientIp(req)}`, 60)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const listingKey = (req.nextUrl.searchParams.get('listing') || '').trim();
  if (listingKey) {
    const column = LISTING_ID.test(listingKey) ? 'id' : SLUG.test(listingKey) ? 'slug' : null;
    if (!column) return NextResponse.json({ error: 'bad_listing' }, { status: 400 });
    try {
      return json({ listing: await listingByColumn(column, listingKey) });
    } catch {
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
  }

  const slug = (req.nextUrl.searchParams.get('slug') || '').trim();
  if (slug) {
    if (!SLUG.test(slug)) return NextResponse.json({ error: 'bad_slug' }, { status: 400 });
    try {
      return json({ listing: await listingBySlug(slug) });
    } catch {
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ listings: [] });
  const [nameRaw, cityRaw] = q.split(',').map((s) => s.trim().replace(/[%_]/g, '').slice(0, 80));
  const name = nameRaw || '';
  if (name.length < 2) return json({ listings: [] });
  const directory = req.nextUrl.searchParams.get('scope') === 'directory';
  try {
    const listings = directory
      ? await searchDirectory(name, cityRaw || '')
      : await searchListings(name, cityRaw || '');
    return json({ listings });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
