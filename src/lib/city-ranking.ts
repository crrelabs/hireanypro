import { normalizeHours } from './hours';

/**
 * Ranked "top pros" table for city x service pages (answer-first block for AI search and featured snippets).
 * Score = Bayesian average of the Google star rating: (v / (v + m)) * R + (m / (v + m)) * C, where v = review
 * count, R = rating, C = the city's review-weighted average and m = PRIOR_REVIEWS. A 5.0 from 3 reviews does not
 * beat a 4.9 from 600. Paid plans (Pro/Featured) never change this ranking; they only change list placement below.
 */
export const PRIOR_REVIEWS = 50;
export const RANKING_SIZE = 10;
const MIN_RANKED = 3;

export type RankingInput = {
  name?: string | null;
  slug?: string | null;
  rating?: number | null;
  review_count?: number | null;
  phone?: string | null;
  website?: string | null;
  hours?: unknown;
  claimed?: boolean | null;
};

export type RankedRow = {
  rank: number;
  name: string;
  slug: string;
  rating: number;
  reviewCount: number;
  score: number;
  hasPhone: boolean;
  hasWebsite: boolean;
  hasHours: boolean;
  weekend: boolean;
  claimed: boolean;
};

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const dedupeKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');

export function rankCityPros(rows: RankingInput[], size = RANKING_SIZE): RankedRow[] {
  const rated = rows.filter((r) => filled(r.name) && filled(r.slug) && Number(r.rating) > 0 && Number(r.review_count) > 0);
  if (rated.length < MIN_RANKED) return [];
  const total = rated.reduce((s, r) => s + Number(r.review_count), 0);
  const cityAvg = rated.reduce((s, r) => s + Number(r.rating) * Number(r.review_count), 0) / total;
  const scored = rated.map((r) => {
    const v = Number(r.review_count);
    const R = Number(r.rating);
    const hours = normalizeHours(r.hours);
    return {
      rank: 0,
      name: String(r.name).trim(),
      slug: String(r.slug).trim(),
      rating: R,
      reviewCount: v,
      score: (v / (v + PRIOR_REVIEWS)) * R + (PRIOR_REVIEWS / (v + PRIOR_REVIEWS)) * cityAvg,
      hasPhone: filled(r.phone),
      hasWebsite: filled(r.website),
      hasHours: !!hours,
      weekend: !!(hours && (hours.saturday || hours.sunday)),
      claimed: !!r.claimed,
    };
  }).sort((a, b) => b.score - a.score || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));
  // Same business listed twice (two locations / duplicate rows): keep the better-scored row only.
  const seen = new Set<string>();
  const out: RankedRow[] = [];
  for (const r of scored) {
    const k = dedupeKey(r.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...r, rank: out.length + 1 });
    if (out.length >= size) break;
  }
  return out.length >= MIN_RANKED ? out : [];
}

/** "November 2026" in Eastern time (pages revalidate hourly, so this tracks the data refresh). */
export function rankingMonth(d = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' });
}
