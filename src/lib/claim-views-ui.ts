/** Post-claim sentence, same floor as the unclaimed listing page. Below this, say nothing. */
export const CLAIM_VIEWS_MIN = 2;
/** Dashboard Pro nudge. One step higher than the claim-success line so a single extra view does not nag. */
export const DASHBOARD_VIEWS_MIN = 3;

/** Integer 30-day view count from a claim or verify response, or null when it should not be shown. */
export function readClaimViews(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const n = (data as { views30?: unknown }).views30;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < CLAIM_VIEWS_MIN) return null;
  return n;
}

export function claimViewsSentence(n: number): string {
  const people = n === 1 ? 'person' : 'people';
  return `${n} ${people} viewed your listing in the last 30 days.`;
}

/**
 * Campaign on the Pro link after a claim. When the views sentence is on screen, cmp ends in `_views`
 * so checkout_open / checkout_start (src + cmp) can be tied to that sentence.
 */
export function withViewsCmp(cmp: string, views: number | null): string {
  if (views == null) return cmp;
  return cmp.endsWith('_views') ? cmp : `${cmp}_views`;
}

/** Copy for a free listing on the owner dashboard, or null when the nudge should stay hidden. */
export function dashboardViewsNudge(views: number | null | undefined, tier: string | null | undefined): string | null {
  if (tier !== 'free') return null;
  if (typeof views !== 'number' || !Number.isInteger(views) || views < DASHBOARD_VIEWS_MIN) return null;
  return `${claimViewsSentence(views)} Free listings hide your phone and website.`;
}
