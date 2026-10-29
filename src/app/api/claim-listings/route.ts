import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const SLUG = /^[a-z0-9-]{1,200}$/;
const STATES = ['FL', 'GA', 'AL'] as const;
const COLUMNS = 'id, name, slug, city, state, claimed, categories(name)';

export type ClaimListingHit = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
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
  claimed: boolean | null;
  categories: unknown;
}): ClaimListingHit {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city || '',
    state: row.state || '',
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
}, ['claim-listing-by-slug-v1'], { revalidate: 120 });

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
}, ['claim-listing-search-v1'], { revalidate: 60 });

function json(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  if (status === 200) res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res;
}

/**
 * Read-only listing lookup for the claim form (id, name, slug, city, state, claimed, category name).
 * The signed one-click token (ct) is not accepted here and must not be logged.
 */
export async function GET(req: NextRequest) {
  if (isRateLimited(`claim-listings:${getClientIp(req)}`, 60)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
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
  try {
    return json({ listings: await searchListings(name, cityRaw || '') });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
