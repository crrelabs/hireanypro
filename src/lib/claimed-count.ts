import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';

/** Claimed listings, excluding zz-hap-test QA rows. Throws on a read error so we never render a made-up count. */
export const getClaimedBusinessCount = unstable_cache(async (): Promise<number> => {
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('claimed', true)
    .in('state', ['FL', 'GA', 'AL'])
    .not('slug', 'like', 'zz-hap-test%');
  if (error) throw new Error(`claimed count: ${error.message}`);
  if (count == null) throw new Error('claimed count missing');
  return count;
}, ['claimed-business-count-v1'], { revalidate: 3600 });
