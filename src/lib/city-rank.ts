import type { SupabaseClient } from '@supabase/supabase-js';

export type RankRow = {
  id: string;
  tier: string | null;
  review_count: number | null;
  city: string | null;
  state: string | null;
  category_id: string | null;
};

export type CityPosition = { cityRank: number | null; cityTotal: number | null; proRank: number | null };

/** Where this listing sits on its city x service page now, and where Pro would put it. Null when unknown. */
export async function cityPosition(supabase: SupabaseClient, l: RankRow): Promise<CityPosition> {
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

export type RankUpgrade = {
  city: string;
  categoryName: string;
  cityRank: number;
  cityTotal: number;
  proRank: number;
};

/**
 * Rank fields for a just-claimed listing, only when Pro would move it up (proRank < cityRank).
 * Uses the caller's service-role client. Never throws: a rank miss must not fail the claim.
 */
export async function rankUpgradeForListing(supabase: SupabaseClient, listingId: string): Promise<RankUpgrade | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, tier, review_count, city, state, category_id, categories(name)')
      .eq('id', listingId)
      .maybeSingle();
    if (error || !data?.id || !data.city || !data.category_id) return null;
    const catRaw = data.categories as { name?: string } | { name?: string }[] | null;
    const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
    const categoryName = typeof cat?.name === 'string' ? cat.name.trim() : '';
    if (!categoryName) return null;
    const pos = await cityPosition(supabase, {
      id: data.id,
      tier: data.tier ?? null,
      review_count: data.review_count ?? null,
      city: data.city,
      state: data.state ?? null,
      category_id: data.category_id,
    });
    if (pos.cityRank == null || pos.cityTotal == null || pos.proRank == null) return null;
    if (!(pos.proRank < pos.cityRank)) return null;
    return { city: data.city, categoryName, cityRank: pos.cityRank, cityTotal: pos.cityTotal, proRank: pos.proRank };
  } catch {
    return null;
  }
}
