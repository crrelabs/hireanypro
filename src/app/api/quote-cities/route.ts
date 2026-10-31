import { NextRequest, NextResponse } from 'next/server';
import { getCategoryBySlug, getCategoryCities } from '@/lib/listings';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

/**
 * Cities that have at least one pro in a category, for the "Get up to 3 free quotes" finder (home, category hubs, /search).
 * Same groups /api/quote-multi accepts, so any city offered here can receive the request.
 */
const SLUG = /^[a-z0-9-]{1,80}$/;

export async function GET(req: NextRequest) {
  if (isRateLimited(`qc:${getClientIp(req)}`, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const slug = (req.nextUrl.searchParams.get('category') || '').trim();
  if (!SLUG.test(slug)) return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
  try {
    const category = await getCategoryBySlug(slug);
    if (!category) return NextResponse.json({ error: 'Unknown service' }, { status: 404 });
    const cities = (await getCategoryCities(category.id))
      .filter((g) => g.count > 0 && g.name)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((g) => ({ slug: g.slug, name: g.name, state: g.state, count: g.count }));
    return NextResponse.json({ category: { slug: category.slug, name: category.name }, cities }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    console.error('quote-cities error', e);
    return NextResponse.json({ error: 'Please try again in a moment.' }, { status: 503 });
  }
}
