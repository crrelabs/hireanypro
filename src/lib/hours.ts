// Hours come in several shapes from the scrape: an object of {open, close} or "09:00-18:00" strings, and sometimes the
// whole object stored as a JSON string. Normalize to { monday: {open, close}, ... } and drop junk; "00:00-00:00" = open 24 hours.

export type DayHours = { open: string; close: string };

export const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function normalizeHours(raw: unknown): Record<string, DayHours> | null {
  let h = raw;
  if (typeof h === 'string') {
    try { h = JSON.parse(h); } catch { return null; }
  }
  if (!h || typeof h !== 'object' || Array.isArray(h)) return null;
  const out: Record<string, DayHours> = {};
  for (const [day, v] of Object.entries(h as Record<string, unknown>)) {
    const d = day.toLowerCase();
    if (!DAY_ORDER.includes(d as (typeof DAY_ORDER)[number]) || v == null) continue;
    const o = typeof v === 'object' ? v as { open?: string; close?: string } : null;
    const open = (o?.open ?? (typeof v === 'string' ? v.split('-')[0] : '') ?? '').trim();
    const close = (o?.close ?? (typeof v === 'string' ? v.split('-')[1] : '') ?? '').trim();
    if (/^\d{1,2}:\d{2}$/.test(open) && /^\d{1,2}:\d{2}$/.test(close)) out[d] = { open, close };
  }
  return Object.keys(out).length >= 2 ? out : null; // a single stray day is scrape noise, not real opening hours
}

export const formatDayHours = (h: DayHours) =>
  (h.open === '00:00' && h.close === '00:00') || (h.open === '00:00' && h.close === '23:59')
    ? 'Open 24 hours'
    : `${h.open} - ${h.close}`;

/** One sentence about a normalized week. Null when hours are missing or junk. */
export function hoursSummary(hours: Record<string, DayHours> | null): string | null {
  if (!hours) return null;
  const openDays = DAY_ORDER.filter((d) => hours[d]);
  if (openDays.length < 2) return null;
  const weekend = !!(hours.saturday || hours.sunday);
  const allWeekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].every((d) => hours[d]);
  const when = weekend ? ', including Saturday or Sunday' : allWeekdays ? ' (Monday through Friday)' : '';
  return `Weekly hours are published for ${openDays.length} days${when}.`;
}
