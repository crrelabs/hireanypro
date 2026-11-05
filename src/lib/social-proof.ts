import { unstable_cache } from 'next/cache';
import { getClaimedBusinessCount } from './claimed-count';
import { countPublicListings, countServiceCategories } from './listing-count';
import type { SocialProofStats } from './social-proof-copy';

export type { SocialProofStats } from './social-proof-copy';

const EMPTY: SocialProofStats = { claimed: null, floridaListings: null, trades: null };

async function positive(read: () => Promise<number>): Promise<number | null> {
  try {
    const n = await read();
    return n >= 1 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Live counts for the /pricing and /claim trust strips.
 * Claimed businesses reuse getClaimedBusinessCount. Florida listings and trades reuse the
 * /llms.txt reads (public listings with test rows removed, and the categories table).
 * One failed read is stored as null so that stat is omitted. All three failing throws,
 * which readSocialProof turns into an empty strip without caching the miss.
 */
async function loadSocialProof(): Promise<SocialProofStats> {
  const [claimed, floridaListings, trades] = await Promise.all([
    positive(getClaimedBusinessCount),
    positive(() => countPublicListings('FL')),
    positive(countServiceCategories),
  ]);
  // A total miss is not cached: the caller omits the strip for this request and the next one tries again.
  if (claimed == null && floridaListings == null && trades == null) {
    throw new Error('social proof counts unavailable');
  }
  return { claimed, floridaListings, trades };
}

const getSocialProof = unstable_cache(loadSocialProof, ['social-proof-v1'], { revalidate: 3600 });

/** Never throws. A failed read (or a cached partial) leaves the missing stats null so the strip can omit them. */
export async function readSocialProof(): Promise<SocialProofStats> {
  try {
    return await getSocialProof();
  } catch {
    return EMPTY;
  }
}
