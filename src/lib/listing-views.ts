import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only: listing_views has RLS with no policies, so only the service role can read or write it.
let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return (admin ??= createClient(url, key));
}

/** Sum of daily views over the last `days` days for each listing id. Never throws (returns {} on error). */
export async function recentViews(ids: string[], days = 30, client?: SupabaseClient | null): Promise<Record<string, number>> {
  const sb = client ?? adminClient();
  const out: Record<string, number> = {};
  if (!sb || ids.length === 0) return out;
  try {
    const since = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);
    const { data } = await sb.from('listing_views').select('listing_id, views').in('listing_id', ids.slice(0, 200)).gte('day', since)
      .order('day', { ascending: true }).limit(1000);
    for (const r of data || []) out[r.listing_id] = (out[r.listing_id] || 0) + (r.views || 0);
  } catch (e) {
    console.error('recentViews failed', e);
  }
  return out;
}
