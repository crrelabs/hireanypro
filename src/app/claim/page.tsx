'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import TurnstileWidget from '@/components/TurnstileWidget';

type ListingResult = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  claimed: boolean;
  categories: { name: string } | null;
};

export default function ClaimPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto py-16 px-4 text-center text-gray-500">Loading...</div>}>
      <ClaimPage />
    </Suspense>
  );
}

function ClaimPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedSlug = searchParams.get('listing');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ListingResult[]>([]);
  const [selected, setSelected] = useState<ListingResult | null>(null);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');

  const loadPreselected = useCallback(async () => {
    if (!preselectedSlug) return;
    const { data } = await supabase
      .from('listings')
      .select('id, name, slug, city, state, claimed, categories(name)')
      .eq('slug', preselectedSlug)
      .single();
    if (data) {
      setSelected(data as unknown as ListingResult);
    }
  }, [preselectedSlug]);

  useEffect(() => {
    loadPreselected();
  }, [loadPreselected]);

  async function searchListings(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    const { data } = await supabase
      .from('listings')
      .select('id, name, slug, city, state, claimed, categories(name)')
      .ilike('name', `%${q}%`)
      .limit(10);
    setResults((data as unknown as ListingResult[]) || []);
  }

  async function handleClaim() {
    if (!selected || !email) return;
    if (!turnstileToken) {
      setError('Please complete the CAPTCHA.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selected.id,
          email,
          turnstileToken,
          website: honeypot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.pendingVerification) {
          setPendingVerification(true);
        } else {
          setSuccess(true);
          setTimeout(() => router.push(`/dashboard?email=${encodeURIComponent(email)}`), 2000);
        }
      } else {
        setError(data.error || 'Failed to claim listing');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerification) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <div className="text-6xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We&apos;ve sent a verification email to <strong>{email}</strong>. Click the link to complete your claim.
        </p>
        <p className="text-sm text-gray-500">The link expires in 24 hours.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Claimed!</h1>
        <p className="text-gray-600 mb-6">Redirecting to your dashboard...</p>
        <Link href={`/dashboard?email=${encodeURIComponent(email)}`} className="text-blue-800 hover:underline">
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Claim Your Business Listing</h1>
        <p className="text-gray-600">Search for your business below and claim it to manage your profile, respond to inquiries, and upgrade your plan.</p>
      </div>

      {!selected ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search for your business</label>
          <input
            type="text"
            value={query}
            onChange={(e) => searchListings(e.target.value)}
            placeholder="Type your business name..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900"
          />
          {results.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white shadow-sm">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setSelected(r); setResults([]); setQuery(''); }}
                  disabled={r.claimed}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-medium text-gray-900">{r.name}</div>
                  <div className="text-sm text-gray-500">
                    {r.city}, {r.state}
                    {r.categories && ` · ${(r.categories as { name: string }).name}`}
                    {r.claimed && ' · Already claimed'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-gray-900">{selected.name}</div>
                <div className="text-sm text-gray-600">{selected.city}, {selected.state}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-sm text-blue-800 hover:underline">
                Change
              </button>
            </div>
          </div>

          {/* Honeypot */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off"
              value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Your email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent mb-4 text-gray-900"
          />

          <div className="mb-4">
            <TurnstileWidget onSuccess={setTurnstileToken} />
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleClaim}
            disabled={loading || !email}
            className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Claiming...' : 'Claim This Listing'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            By claiming, you confirm you are authorized to manage this business listing.
          </p>
        </div>
      )}
    </div>
  );
}
