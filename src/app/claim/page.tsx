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
    <Suspense fallback={<div className="max-w-2xl mx-auto py-16 px-4 text-center"><h1 className="text-3xl font-bold text-gray-900 mb-3">Claim Your Business Listing</h1><p className="text-gray-500">Loading...</p></div>}>
      <ClaimPage />
    </Suspense>
  );
}

function ClaimPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedSlug = searchParams.get('listing');
  const claimToken = searchParams.get('ct') || '';
  // The one-click token carries the email it was sent to; prefill it (the server re-checks everything).
  const tokenEmail = (() => {
    try { const p = JSON.parse(atob((claimToken.split('.')[0] || '').replace(/-/g, '+').replace(/_/g, '/'))); return typeof p.e === 'string' ? p.e : ''; } catch { return ''; }
  })();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ListingResult[]>([]);
  const [selected, setSelected] = useState<ListingResult | null>(null);
  const [email, setEmail] = useState(tokenEmail);
  const [useToken, setUseToken] = useState(!!tokenEmail);
  const [claimedListingId, setClaimedListingId] = useState('');
  const [phone, setPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [preselectMissing, setPreselectMissing] = useState(false);

  const loadPreselected = useCallback(async () => {
    if (!preselectedSlug) return;
    const { data } = await supabase
      .from('listings')
      .select('id, name, slug, city, state, claimed, categories(name)')
      .eq('slug', preselectedSlug)
      .single();
    if (data) {
      setSelected(data as unknown as ListingResult);
    } else {
      setPreselectMissing(true);
    }
  }, [preselectedSlug]);

  function track(name: string, params: Record<string, unknown> = {}) {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.('event', name, { page_path: window.location.pathname, ...params });
  }

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
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selected.id,
          email,
          phone,
          turnstileToken,
          claimToken: useToken ? claimToken : undefined,
          emailOptIn,
          smsOptIn,
          website: honeypot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        track('claim_submit', { listing_slug: selected.slug, resent: !!data.resent, method: data.verified ? 'one_click' : 'email_link' });
        setResent(!!data.resent);
        if (data.verified) {
          track('claim_verified', { listing_slug: selected.slug, method: 'one_click' });
          setClaimedListingId(data.listingId || selected.id);
          setSuccess(true);
        } else if (data.pendingVerification) {
          setPendingVerification(true);
        } else {
          setSuccess(true);
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } else {
        track('claim_error', { listing_slug: selected.slug, reason: String(data.error || '').slice(0, 80) });
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
          {resent ? 'We sent you a fresh verification link' : 'We\u2019ve sent a verification email'} to <strong>{email}</strong>. Click the link to complete your claim.
        </p>
        <p className="text-sm text-gray-500 mb-2">The link expires in 24 hours. It usually arrives within a minute; check your spam or promotions folder if you don&apos;t see it.</p>
        <p className="text-sm text-gray-500">Wrong address? <button onClick={() => { setPendingVerification(false); setEmail(''); }} className="text-blue-800 hover:underline">Use a different email</button>. Need help? Email <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a>.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Claimed!</h1>
        <p className="text-gray-600 mb-6">{selected?.name} is now yours. You&apos;re signed in, so you can update your details right away.</p>
        <Link href="/dashboard" className="inline-block bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
          Go to Dashboard →
        </Link>
        {claimedListingId && (
          <div className="mt-10 text-left bg-white border-2 border-blue-800 rounded-xl p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-1">Optional upgrade</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Get every quote request in your inbox: Pro, $9/month</h2>
            <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc pl-5">
              <li>See the customer&apos;s name, phone and email on every request</li>
              <li>Your phone, email and website shown on your listing</li>
              <li>Ranked above free listings, plus a Verified badge</li>
            </ul>
            <Link href={`/pricing?plan=pro&listing=${encodeURIComponent(claimedListingId)}&utm_source=claim_success&utm_medium=web&utm_campaign=post_claim`}
              className="block text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg">Upgrade to Pro: $9/month</Link>
            <p className="text-xs text-gray-500 text-center mt-2">Cancel anytime. Your free listing stays free if you skip this.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Claim Your Business Listing</h1>
        <p className="text-gray-600">Free forever. No credit card. Takes about a minute.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 text-sm">
        {[
          ['📨', 'Get customer quote requests', 'Homeowners already request quotes from listings like yours. Claim to receive them.'],
          ['✏️', 'Fix your info', 'Update your phone, hours, services, website and description.'],
          ['✅', 'Show as a claimed business', 'Claimed profiles look trustworthy and stand out from unclaimed ones.'],
          ['🔒', 'Stay in control', 'Only you can edit your listing after you verify your email.'],
        ].map(([icon, title, text]) => (
          <div key={title} className="flex gap-3 bg-white border border-gray-200 rounded-lg p-4">
            <span className="text-xl" aria-hidden="true">{icon}</span>
            <div>
              <div className="font-semibold text-gray-900">{title}</div>
              <div className="text-gray-600">{text}</div>
            </div>
          </div>
        ))}
      </div>

      {preselectMissing && !selected && (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">We couldn&apos;t find that listing link. Search for your business name below.</p>
      )}

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
          {selected.claimed ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <div className="font-semibold text-gray-900 mb-1">{selected.name} has already been claimed.</div>
              If you manage this business, <Link href="/dashboard" className="text-blue-800 hover:underline">sign in to your dashboard</Link>.
              If someone else claimed it, email <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a> and we&apos;ll sort it out.
              <div className="mt-3"><button onClick={() => setSelected(null)} className="text-blue-800 hover:underline">Search for a different business</button></div>
            </div>
          ) : (<>
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
          {useToken && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              ✅ You opened this from our email to {tokenEmail}, so no verification email is needed. Just click the button below.{' '}
              <button type="button" onClick={() => { setUseToken(false); setEmail(''); }} className="text-blue-800 hover:underline">Use a different email</button>
            </p>
          )}
          <input
            type="email"
            value={email}
            readOnly={useToken}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent mb-4 text-gray-900"
          />

          <label className="block text-sm font-medium text-gray-700 mb-2">Phone number <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent mb-4 text-gray-900"
          />

          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={emailOptIn}
              onChange={(e) => setEmailOptIn(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-800 border-gray-300 rounded focus:ring-blue-800"
            />
            <span className="text-sm text-gray-600">
              (Optional, email only) Send me HireAnyPro emails with listing tips and product news. This is separate from text messages: no marketing is ever sent by SMS. You can unsubscribe at any time.
            </span>
          </label>

          <div className="mb-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-gray-900 mb-1">📱 Get new quote requests by text (optional)</p>
          <p className="text-sm text-gray-700 mb-3">Pros who answer first win more jobs. Tick the box to get a short text alert when a homeowner requests a quote. Alerts only, never marketing.</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-800 border-gray-300 rounded focus:ring-blue-800"
            />
            <span className="text-sm text-gray-600">
              (Optional) I consent to receive SMS text messages from HireAnyPro Alerts (CRRE Labs LLC) at the phone number provided above, including new lead notifications, quote request updates, and account updates. No marketing or promotional texts are sent. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See our{' '}
              <a href="/terms#sms-terms" className="text-blue-800 hover:underline">SMS Terms</a> and{' '}
              <a href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</a>.
            </span>
          </label>
          </div>

          <div className="mb-4">
            <TurnstileWidget onSuccess={setTurnstileToken} />
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleClaim}
            disabled={loading || !email}
            className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (useToken ? 'Claiming...' : 'Sending link...') : 'Claim This Listing — Free'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            By claiming, you confirm you are authorized to manage this business listing.{useToken ? '' : ' We\u2019ll email you a one-click verification link.'}
          </p>
          </>)}
        </div>
      )}
    </div>
  );
}
