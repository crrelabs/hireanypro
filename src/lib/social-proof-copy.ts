/** Trust-strip numbers. Null means that read failed or came back empty, so the stat is left off. */
export type SocialProofStats = {
  claimed: number | null;
  /** Exact Florida listing count (state FL, test rows excluded). Rounded only when displayed. */
  floridaListings: number | null;
  trades: number | null;
};

/**
 * "27,487" -> "27,000+". Floors to the previous thousand so the strip never overstates the directory.
 * Counts under 1,000 stay exact. Zero, negative, and non-finite values are omitted.
 */
export function formatListingProof(n: number): string | null {
  if (!Number.isFinite(n) || n < 1) return null;
  const whole = Math.floor(n);
  if (whole < 1000) return whole.toLocaleString('en-US');
  const floored = Math.floor(whole / 1000) * 1000;
  return `${floored.toLocaleString('en-US')}+`;
}

/** Compact facts for the pricing and claim strips. Empty when every count is missing. */
export function socialProofParts(stats: SocialProofStats): string[] {
  const parts: string[] = [];
  if (stats.claimed != null && stats.claimed >= 1) {
    const n = Math.floor(stats.claimed);
    parts.push(`${n.toLocaleString('en-US')} ${n === 1 ? 'business' : 'businesses'} claimed`);
  }
  if (stats.floridaListings != null) {
    const label = formatListingProof(stats.floridaListings);
    if (label) parts.push(`${label} Florida listings`);
  }
  if (stats.trades != null && stats.trades >= 1) {
    const n = Math.floor(stats.trades);
    parts.push(`${n.toLocaleString('en-US')} ${n === 1 ? 'trade' : 'trades'}`);
  }
  return parts;
}
