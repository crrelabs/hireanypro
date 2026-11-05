import { supabase } from './supabase';

/**
 * Public directory size. Same exclusion as /llms.txt: drop zz-hap-test QA rows.
 * Throws on a read error so callers never substitute a made-up number.
 * Optional state keeps the same exclusion and limits the count (Florida coverage uses 'FL').
 */
export async function countPublicListings(state?: string): Promise<number> {
  let query = supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .not('slug', 'like', 'zz-hap-test%');
  if (state) query = query.eq('state', state);
  const { count, error } = await query;
  if (error) throw new Error(`listing count: ${error.message}`);
  if (count == null) throw new Error('listing count missing');
  return count;
}

/** Rows in the categories table, the same source /llms.txt uses for its service list. */
export async function countServiceCategories(): Promise<number> {
  const { count, error } = await supabase.from('categories').select('id', { count: 'exact', head: true });
  if (error) throw new Error(`category count: ${error.message}`);
  if (count == null) throw new Error('category count missing');
  return count;
}
