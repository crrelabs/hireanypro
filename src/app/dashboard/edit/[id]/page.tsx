'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Category } from '@/lib/supabase';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m}`);
  }
}

type HoursMap = Record<string, { open: string; close: string } | string>;

function EditForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const listingId = params.id as string;
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

  useEffect(() => {
    async function load() {
      const [{ data: listing }, { data: cats }] = await Promise.all([
        supabase.from('listings').select('*').eq('id', listingId).single(),
        supabase.from('categories').select('id, name, slug, icon, parent_id').order('name'),
      ]);

      if (listing) {
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
      }
      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, [listingId]);

  function updateHours(day: string, field: 'open' | 'close', value: string) {
    setHours((prev) => {
      const current = typeof prev[day] === 'object' ? prev[day] as { open: string; close: string } : { open: '09:00', close: '17:00' };
      return { ...prev, [day]: { ...current, [field]: value } };
    });
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
    try {
      const res = await fetch('/api/listing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId, email, name, description, phone, contactEmail, website,
          address, city, state, zip, hours, category_id: categoryId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
      } else {
        setMessage({ type: 'success', text: 'Listing updated successfully!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto py-20 px-4 text-center text-gray-500">Loading listing...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
        <Link href={`/dashboard?email=${encodeURIComponent(email)}`} className="text-sm text-blue-800 hover:text-blue-600 font-medium">
          ← Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Business Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900 bg-white">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h2>
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
          <Link href={`/dashboard?email=${encodeURIComponent(email)}`} className="text-gray-500 hover:text-gray-700 text-sm font-medium">
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
