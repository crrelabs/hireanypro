/** Pure blog helpers. Safe to import from client components: this module does not touch Supabase. */

export function formatCategory(cat: string) {
  return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
