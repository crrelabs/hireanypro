import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Listing, city, category and region pages are cached (ISR). After anything that changes what a listing page shows
 * (owner edit, claim, plan change, new review), purge that listing page and its city page so the change is live at once.
 * Never throws: a failed purge only means the page refreshes on its normal hourly schedule.
 */
export async function revalidateListing(supabase: SupabaseClient, listingId: string | null | undefined) {
  if (!listingId) return;
  try {
    const { data } = await supabase.from('listings').select('slug, city, state, categories(slug)').eq('id', listingId).maybeSingle();
    if (!data?.slug) return;
    revalidatePath(`/listing/${data.slug}`);
    const cat = (data.categories as unknown as { slug?: string } | null)?.slug;
    if (cat) revalidatePath(`/category/${cat}`);
    if (cat && data.city) {
      const { cityPageSlug } = await import('@/lib/geo');
      revalidatePath(`/services/${cat}/${cityPageSlug(data.city, data.state)}`);
    }
  } catch (e) {
    console.error('revalidateListing failed', e);
  }
}
