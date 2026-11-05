import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { sessionEmail, likeExact } from '@/lib/session';
import { recentViews } from '@/lib/listing-views';
import { listingStrength } from '@/lib/listing-strength';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BADGE_TTL_MS = 86_400_000;
const BADGE_MAX_BYTES = 1024 * 1024;
const BADGE_TIMEOUT_MS = 3000;
const badgeCache = new Map<string, { at: number; detected: boolean }>();

/** Listing website fields must not be able to point this server at localhost or a private address. */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '0.0.0.0' || host === '::1' || host === '::') return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const n = v4.slice(1).map((x) => Number(x));
    if (n.some((x) => x > 255)) return true;
    const [a, b] = n;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (host.includes(':')) {
    const h = host.split('%')[0];
    if (h === '::1' || h === '::') return true;
    if (/^f[cd]/i.test(h) || /^fe[89ab]/i.test(h)) return true;
  }
  return false;
}

/** Homepage URL for a listing website. Adds https:// when the value has no scheme. */
function homepageUrl(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (isBlockedHost(url.hostname)) return null;
  const host = url.hostname;
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  if (!isIp && !host.includes('.')) return null;
  return `${url.protocol}//${url.host}/`;
}

/** Badge is installed when the homepage HTML links the listing or the badge image. www. is allowed. */
function htmlHasBadge(html: string, slug: string): boolean {
  if (!slug) return false;
  const slugEsc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z0-9.])(?:www\\.)?hireanypro\\.com/(?:listing|api/badge)/${slugEsc}(?![a-z0-9-])`, 'i');
  return re.test(html);
}

async function readLimited(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    return text.length > max ? text.slice(0, max) : text;
  }
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < max) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      const room = max - total;
      const slice = value.byteLength > room ? value.subarray(0, room) : value;
      parts.push(slice);
      total += slice.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    buf.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

async function fetchHomepage(url: string, signal: AbortSignal): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, {
      signal,
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; HireAnyPro-BadgeCheck/1.0; +https://hireanypro.com)',
      },
      next: { revalidate: 86400 },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.body?.cancel().catch(() => undefined);
      if (!loc) return null;
      let nextUrl: URL;
      try { nextUrl = new URL(loc, current); } catch { return null; }
      if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') return null;
      if (isBlockedHost(nextUrl.hostname)) return null;
      current = nextUrl.toString();
      continue;
    }
    return res;
  }
  return null;
}

/** Failure, timeout, or a blocked URL means the badge was not detected. Never throws. */
async function detectBadgeOnSite(url: string, slug: string): Promise<boolean> {
  const key = `${slug}\n${url}`;
  const now = Date.now();
  const hit = badgeCache.get(key);
  if (hit && now - hit.at < BADGE_TTL_MS) return hit.detected;
  if (badgeCache.size > 200) {
    for (const [k, v] of badgeCache) {
      if (now - v.at >= BADGE_TTL_MS) badgeCache.delete(k);
    }
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BADGE_TIMEOUT_MS);
  let detected = false;
  try {
    const res = await fetchHomepage(url, ctrl.signal);
    if (res?.ok) {
      const html = await readLimited(res, BADGE_MAX_BYTES);
      detected = htmlHasBadge(html, slug);
    } else {
      await res?.body?.cancel().catch(() => undefined);
    }
  } catch {
    detected = false;
  } finally {
    clearTimeout(timer);
  }
  badgeCache.set(key, { at: now, detected });
  return detected;
}

async function badgeForListing(website: unknown, slug: unknown): Promise<{ hasWebsite: boolean; badgeDetected: boolean }> {
  const raw = typeof website === 'string' ? website.trim() : '';
  const cleanSlug = typeof slug === 'string' ? slug.trim() : '';
  if (!raw) return { hasWebsite: false, badgeDetected: false };
  const url = homepageUrl(raw);
  if (!url || !cleanSlug) return { hasWebsite: true, badgeDetected: false };
  try {
    return { hasWebsite: true, badgeDetected: await detectBadgeOnSite(url, cleanSlug) };
  } catch {
    return { hasWebsite: true, badgeDetected: false };
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`dashboard:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // Identity comes only from the signed session cookie (set by the emailed sign-in link or claim verification).
    const email = sessionEmail(req);
    if (!email) {
      // 200 with signedIn:false (not 401) so signed-out visitors don't get a console error on /dashboard.
      return NextResponse.json({ signedIn: false, error: 'Please sign in.' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', likeExact(email))
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ email, listings: [], inquiries: [], totalInquiries: 0, monthInquiries: 0 });
    }

    // Get claimed listings via subscriptions
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('listing_id, plan')
      .eq('profile_id', profile.id)
      .eq('status', 'active');

    const listingIds = (subs || []).map((s) => s.listing_id).filter(Boolean);
    const planMap = Object.fromEntries((subs || []).map((s) => [s.listing_id, s.plan]));

    let listings: Array<Record<string, unknown>> = [];
    if (listingIds.length > 0) {
      const { data: listingData } = await supabase
        .from('listings')
        .select('id, name, slug, tier, rating, review_count, description, phone, website, hours, address, email, city, state, category_id, categories(name)')
        .in('id', listingIds);
      const { data: optRows } = await supabase
        .from('sms_queue')
        .select('listing_id, to_phone')
        .in('listing_id', listingIds)
        .eq('status', 'opt_in');
      const optMap = Object.fromEntries((optRows || []).map((r) => [r.listing_id, r.to_phone]));
      const views = await recentViews(listingIds, 30, supabase);
      const rows = listingData || [];
      // Homepage checks run alongside the rank queries. A failed fetch is "not detected" and must not fail the dashboard.
      const badgeChecks = Promise.all(rows.map((l) => badgeForListing(l.website, l.slug)));
      // Position on the city x service page: Featured first, then Pro, then free, each by review count (lib/listings).
      const ranks = await Promise.all(rows.map((l) => cityPosition(l)));
      const badges = await badgeChecks;
      listings = rows.map((l, i) => {
        const strength = listingStrength(l);
        const cat = Array.isArray(l.categories) ? l.categories[0] : l.categories;
        return {
          id: l.id, name: l.name, slug: l.slug, rating: l.rating, review_count: l.review_count,
          tier: planMap[l.id] || l.tier, smsPhone: optMap[l.id] || null, views30: views[l.id] || 0,
          city: l.city, categoryName: (cat as { name?: string } | null)?.name || null,
          strength: strength.score, checklist: strength.items, ...ranks[i],
          hasWebsite: badges[i].hasWebsite, badgeDetected: badges[i].badgeDetected,
        };
      });
    }

    // Get inquiries for these listings
    let inquiries: Array<Record<string, unknown>> = [];
    let totalInquiries = 0;
    let monthInquiries = 0;

    if (listingIds.length > 0) {
      const { data: inqData } = await supabase
        .from('inquiries')
        .select('*')
        .in('listing_id', listingIds)
        .neq('status', 'internal')
        .order('created_at', { ascending: false })
        .limit(20);
      // Free listings only get a teaser: never send homeowner contact details to the browser.
      const paid = new Set(listings.filter((l) => l.tier === 'pro' || l.tier === 'featured').map((l) => l.id));
      inquiries = (inqData || []).map((q) => paid.has(q.listing_id)
        ? q
        : { id: q.id, listing_id: q.listing_id, created_at: q.created_at, name: 'Locked lead', email: '', phone: null, message: '' });

      const { count: total } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .neq('status', 'internal');
      totalInquiries = total || 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: monthCount } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .neq('status', 'internal')
        .gte('created_at', thirtyDaysAgo);
      monthInquiries = monthCount || 0;
    }

    const views30 = listings.reduce((n, l) => n + (Number(l.views30) || 0), 0);
    return NextResponse.json({ email, listings, inquiries, totalInquiries, monthInquiries, views30 });
  } catch (e) {
    console.error('dashboard api error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

type RankRow = { id: string; tier: string | null; review_count: number | null; city: string | null; state: string | null; category_id: string | null };

/** Where this listing sits on its city x service page now, and where Pro would put it. Null when unknown. */
async function cityPosition(l: RankRow): Promise<{ cityRank: number | null; cityTotal: number | null; proRank: number | null }> {
  if (!l.city || !l.category_id) return { cityRank: null, cityTotal: null, proRank: null };
  try {
    const base = () => supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('category_id', l.category_id).eq('city', l.city).eq('state', l.state || 'FL');
    const mine = Number(l.review_count || 0);
    const [total, featured, proMore, freeMore] = await Promise.all([
      base(),
      base().or('featured.eq.true,tier.eq.featured').neq('id', l.id),
      base().eq('tier', 'pro').not('featured', 'is', true).gt('review_count', mine).neq('id', l.id),
      base().or('tier.is.null,tier.eq.free').not('featured', 'is', true).gt('review_count', mine).neq('id', l.id),
    ]);
    if (total.error || featured.error || proMore.error || freeMore.error) return { cityRank: null, cityTotal: null, proRank: null };
    const paidAbove = (featured.count || 0);
    const proCount = await base().eq('tier', 'pro').not('featured', 'is', true).neq('id', l.id);
    const isFree = (l.tier || 'free') === 'free';
    // Free: every Featured and Pro listing is above it, plus free listings with more reviews.
    const cityRank = isFree ? paidAbove + (proCount.count || 0) + (freeMore.count || 0) + 1 : paidAbove + (proMore.count || 0) + 1;
    const proRank = paidAbove + (proMore.count || 0) + 1;
    return { cityRank, cityTotal: total.count || null, proRank };
  } catch {
    return { cityRank: null, cityTotal: null, proRank: null };
  }
}
