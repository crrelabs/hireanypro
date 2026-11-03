import { normalizeHours } from './hours';

/** Owner-facing "listing strength" checklist. Each item is something the owner can fix in /dashboard/edit/<id>. */
export type StrengthItem = { key: string; label: string; done: boolean; why: string };

export type StrengthInput = {
  description?: string | null;
  phone?: string | null;
  website?: string | null;
  hours?: unknown;
  address?: string | null;
  email?: string | null;
};

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

export function listingStrength(l: StrengthInput): { score: number; items: StrengthItem[] } {
  const desc = (l.description || '').trim();
  const items: StrengthItem[] = [
    { key: 'description', label: 'Write a description in your own words (2+ sentences)', done: desc.length >= 120, why: 'Homeowners compare pros by what they read first.' },
    { key: 'hours', label: 'Add your opening hours', done: !!normalizeHours(l.hours), why: 'Shown on your listing and in search results.' },
    { key: 'website', label: 'Add your website', done: filled(l.website), why: 'Lets customers check your work before they call.' },
    { key: 'phone', label: 'Confirm your phone number', done: filled(l.phone), why: 'So quote requests can reach you fast.' },
    { key: 'address', label: 'Add your address or service area', done: filled(l.address), why: 'Helps you show up for nearby searches.' },
    { key: 'email', label: 'Add a contact email for quote requests', done: filled(l.email), why: 'Quote requests are emailed to this address.' },
  ];
  const score = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { score, items };
}
