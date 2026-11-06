export type ClaimRankFields = {
  city: string;
  categoryName: string;
  cityRank: number;
  cityTotal: number;
  proRank: number;
};

/** Rank payload from a successful claim response. Null unless Pro would improve the rank. */
export function readClaimRank(data: unknown): ClaimRankFields | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const city = typeof d.city === 'string' ? d.city.trim() : '';
  const categoryName = typeof d.categoryName === 'string' ? d.categoryName.trim() : '';
  const cityRank = d.cityRank;
  const cityTotal = d.cityTotal;
  const proRank = d.proRank;
  if (!city || !categoryName) return null;
  if (!Number.isInteger(cityRank) || !Number.isInteger(cityTotal) || !Number.isInteger(proRank)) return null;
  if ((cityRank as number) < 1 || (cityTotal as number) < 1 || (proRank as number) < 1) return null;
  if (!((proRank as number) < (cityRank as number))) return null;
  return { city, categoryName, cityRank: cityRank as number, cityTotal: cityTotal as number, proRank: proRank as number };
}

export function claimRankSentence(r: ClaimRankFields): string {
  return `You are #${r.cityRank} of ${r.cityTotal} on the ${r.categoryName} page for ${r.city}. Pro listings show above free ones, so Pro would move you to #${r.proRank}.`;
}
