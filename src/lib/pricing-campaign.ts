/**
 * src and cmp from an internal link. Outbound email keeps utm_*; those params are not copied onto funnel events.
 */
export function pricingCampaign(search: string): { src?: string; cmp?: string } {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const src = (q.get('src') || '').trim().slice(0, 80);
  const cmp = (q.get('cmp') || '').trim().slice(0, 80);
  const out: { src?: string; cmp?: string } = {};
  if (src) out.src = src;
  if (cmp) out.cmp = cmp;
  return out;
}
