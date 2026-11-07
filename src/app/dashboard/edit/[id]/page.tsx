'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { listingStrength } from '@/lib/listing-strength';
import { isAutomatedBrowser, onHuman, track } from '@/lib/track';

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m}`);
  }
}

type HoursMap = Record<string, { open: string; close: string } | string>;
type HoursPreset = 'mon_fri_8_5' | 'mon_sat_8_6' | 'clear';

function hoursFromPreset(preset: HoursPreset): HoursMap {
  if (preset === 'clear') return Object.fromEntries(DAYS.map((day) => [day, 'Closed']));
  const close = preset === 'mon_fri_8_5' ? '17:00' : '18:00';
  const openDays = preset === 'mon_fri_8_5' ? 5 : 6;
  return Object.fromEntries(DAYS.map((day, i) => [day, i < openDays ? { open: '08:00', close } : 'Closed']));
}

type PostSaveStrength = ReturnType<typeof listingStrength>;

const fieldClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900 scroll-mt-24';

function jumpToField(key: string) {
  track('listing_strength_nudge_click', { item: key });
  const el = document.getElementById(`edit-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = el.matches('input, textarea, select')
    ? el
    : el.querySelector('input, textarea, select, button');
  if (focusable instanceof HTMLElement) focusable.focus({ preventScroll: true });
}

function EditForm() {
  const params = useParams();
  const listingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [hours, setHours] = useState<HoursMap>({});
  const [hoursPreset, setHoursPreset] = useState<HoursPreset | null>(null);
  const [listingTier, setListingTier] = useState<string | null>(null);
  const [postSaveStrength, setPostSaveStrength] = useState<PostSaveStrength | null>(null);
  const viewedNudge = useRef<PostSaveStrength | null>(null);
  const strengthRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/listing/${encodeURIComponent(listingId)}`, { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setLoadError(body.error || (res.status === 401
            ? 'Your session expired. Please sign in again from the dashboard.'
            : 'You do not own this listing.'));
          return;
        }
        if (!res.ok || !body.listing) {
          setLoadError(body.error || 'Could not load this listing.');
          return;
        }
        const listing = body.listing;
        setName(listing.name || '');
        setDescription(listing.description || '');
        setPhone(listing.phone || '');
        setContactEmail(listing.email || '');
        setWebsite(listing.website || '');
        setAddress(listing.address || '');
        setCity(listing.city || '');
        setState(listing.state || '');
        setZip(listing.zip || '');
        setCategoryId(listing.category_id || '');
        setHours(listing.hours || {});
        setListingTier(typeof listing.tier === 'string' && listing.tier ? listing.tier : null);
        setCategories(body.categories || []);
      } catch {
        if (!cancelled) setLoadError('Network error. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [listingId]);

  // The save click is the human signal. Arm onHuman first so that click counts, and the nudge view
  // fires when the banner is shown instead of waiting for a second interaction.
  useEffect(() => onHuman(() => {}), []);

  // Count a view once per save that still has missing fields, and only after a human signal.
  useEffect(() => {
    if (!postSaveStrength || postSaveStrength.score >= 100) return;
    const strength = postSaveStrength;
    const missing = strength.items.filter((item) => !item.done).length;
    return onHuman(() => {
      if (viewedNudge.current === strength) return;
      viewedNudge.current = strength;
      track('listing_strength_nudge_view', { score: strength.score, missing });
    });
  }, [postSaveStrength]);

  useEffect(() => {
    if (!postSaveStrength) return;
    strengthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [postSaveStrength]);

  function updateHours(day: string, field: 'open' | 'close', value: string) {
    setHours((prev) => {
      const current = typeof prev[day] === 'object' ? prev[day] as { open: string; close: string } : { open: '09:00', close: '17:00' };
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  }

  function applyHoursPreset(preset: HoursPreset) {
    setHours(hoursFromPreset(preset));
    setHoursPreset(preset);
  }

  function toggleClosed(day: string) {
    setHours((prev) => {
      if (prev[day] === 'Closed') {
        return { ...prev, [day]: { open: '09:00', close: '17:00' } };
      }
      return { ...prev, [day]: 'Closed' };
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setPostSaveStrength(null);
    try {
      const res = await fetch('/api/listing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId, name, description, phone, contactEmail, website,
          address, city, state, zip, hours, category_id: categoryId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
      } else {
        const strength = listingStrength({ description, phone, website, hours, address, email: contactEmail });
        setPostSaveStrength(strength);
        // Owner-onboarding metric: saves, and which entry point (claim_success, dashboard_checklist) brought them here.
        if (!isAutomatedBrowser()) {
          const w = window as unknown as { gtag?: (...a: unknown[]) => void };
          const src = new URLSearchParams(window.location.search).get('src') || 'direct';
          w.gtag?.('event', 'listing_saved', {
            source: src,
            has_listing: true,
            form: description.trim().length >= 120 ? 'description_ok' : 'description_short',
            ...(hoursPreset ? { hours_preset: hoursPreset } : {}),
            strength_score: strength.score,
          });
        }
      }
    } catch {
      setPostSaveStrength(null);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto py-20 px-4 text-center text-gray-500">Loading listing...</div>;
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
          <Link href="/dashboard" className="text-sm text-blue-800 hover:text-blue-600 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="mb-6 p-4 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
        <Link href="/dashboard" className="text-sm text-blue-800 hover:text-blue-600 font-medium">
          ← Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          {message.text}
        </div>
      )}

      {postSaveStrength && (
        <div ref={strengthRef} className="mb-6 scroll-mt-24 rounded-lg border border-green-200 bg-green-50 p-4 text-sm" role="status" data-testid="post-save-strength">
          <p className="font-semibold text-green-800">Saved.</p>
          {postSaveStrength.score < 100 ? (
            <div className="mt-3">
              <p className="font-semibold text-gray-900">Listing strength: {postSaveStrength.score}%</p>
              <ul className="mt-2 space-y-1">
                {postSaveStrength.items.filter((item) => !item.done).map((item) => (
                  <li key={item.key} className="text-gray-700">
                    <button type="button" onClick={() => jumpToField(item.key)} className="text-left font-medium text-blue-800 hover:underline">
                      {item.label}
                    </button>
                    <span className="text-gray-500"> · {item.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-1 text-green-800">
              <p>Your listing looks complete.</p>
              {listingTier === 'free' && (
                <p className="mt-2">
                  <Link href={`/pricing?plan=pro&listing=${listingId}&src=edit_complete&cmp=strength_100`} className="font-semibold text-blue-800 hover:underline">
                    Upgrade to Pro ($9/mo)
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Business Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={fieldClass} />
              <p className={`mt-1 text-xs ${description.trim().length >= 120 ? 'text-green-700' : 'text-gray-500'}`}>
                {description.trim().length} characters. Complete at 120+ characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${fieldClass} bg-white`}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="edit-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="edit-website" className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input id="edit-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={fieldClass} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input id="edit-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div id="edit-hours" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => applyHoursPreset('mon_fri_8_5')} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50">Mon–Fri 8am–5pm</button>
            <button type="button" onClick={() => applyHoursPreset('mon_sat_8_6')} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50">Mon–Sat 8am–6pm</button>
            <button type="button" onClick={() => applyHoursPreset('clear')} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50">Clear hours</button>
          </div>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const isClosed = hours[day] === 'Closed';
              const dayHours = typeof hours[day] === 'object' ? hours[day] as { open: string; close: string } : { open: '09:00', close: '17:00' };
              return (
                <div key={day} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="w-28 text-sm font-medium text-gray-700 capitalize">{day}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isClosed} onChange={() => toggleClosed(day)} className="rounded border-gray-300 text-blue-800 focus:ring-blue-800" />
                    <span className="text-sm text-gray-600">Closed</span>
                  </label>
                  {!isClosed && (
                    <>
                      <select value={dayHours.open} onChange={(e) => updateHours(day, 'open', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-800">
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-gray-400 text-sm">to</span>
                      <select value={dayHours.close} onChange={(e) => updateHours(day, 'close', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-800">
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button onClick={handleSave} disabled={saving} className="bg-blue-800 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-20 px-4 text-center text-gray-500">Loading...</div>}>
      <EditForm />
    </Suspense>
  );
}
