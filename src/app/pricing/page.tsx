'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Biz = { id: string; name: string; slug: string; city?: string | null; tier?: string | null; claimed?: boolean | null };
const track = (name: string, p: Record<string, unknown> = {}) => {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.('event', name, { page_path: '/pricing', ...p });
};

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Get your business listed and visible to customers.',
    features: [
      'Basic listing in directory',
      'Appears in search results',
      'Business name & address',
      'Category placement',
      'Edit your business details',
    ],
    cta: 'Claim Your Listing',
    ctaLink: '/claim',
    style: 'border-gray-200 bg-white',
    buttonStyle: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    badge: null,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/mo',
    description: 'Stand out and get more leads with premium features.',
    features: [
      'Everything in Free',
      'Direct lead routing to your email',
      'Phone, email & website displayed',
      'Verified badge ✓',
      'Ranked above free listings',
      'Optional text alerts for new quote requests',
      'Full customer contact details on every request',
    ],
    cta: 'Upgrade to Pro',
    plan: 'pro' as const,
    style: 'border-blue-800 bg-white ring-2 ring-blue-800',
    buttonStyle: 'bg-blue-800 text-white hover:bg-blue-700',
    badge: 'Most Popular',
  },
  {
    name: 'Featured',
    price: '$49.99',
    period: '/mo',
    description: 'Maximum visibility and premium placement everywhere.',
    features: [
      'Everything in Pro',
      'Top placement in all searches',
      'Homepage carousel feature',
      'Highlighted listing card',
      'Lead stats in your dashboard',
      'Featured badge ⭐',
      'Priority customer support',
    ],
    cta: 'Go Featured',
    plan: 'featured' as const,
    style: 'border-orange-400 bg-gradient-to-b from-orange-50 to-white',
    buttonStyle: 'bg-orange-500 text-white hover:bg-orange-600',
    badge: null,
  },
];

export default function PricingPage() {
  const [listingId, setListingId] = useState('');
  const [biz, setBiz] = useState<Biz | null>(null);
  const [owned, setOwned] = useState<Biz[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Biz[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'featured' | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const l = params.get('listing') || '';
    setListingId(l);
    const plan = params.get('plan');
    if (plan === 'pro' || plan === 'featured') setSelectedPlan(plan);
    if (l) {
      const col = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(l) ? 'id' : 'slug';
      supabase.from('listings').select('id, name, slug, city, tier, claimed').eq(col, l).maybeSingle()
        .then(({ data }) => { if (data) setBiz(data as Biz); });
    }
    fetch('/api/auth/me').then((r) => r.json()).then((me) => {
      if (!me?.signedIn) return;
      setSignedIn(true); setEmail(me.email || '');
      const ls = (me.listings || []) as Biz[];
      setOwned(ls);
      if (!l && ls.length === 1) { setBiz(ls[0]); setListingId(ls[0].id); }
    }).catch(() => {});
  }, []);

  useEffect(() => { if (selectedPlan) track('checkout_open', { plan: selectedPlan }); }, [selectedPlan]);

  async function search(v: string) {
    setQ(v);
    if (v.trim().length < 2) { setResults([]); return; }
    const { data } = await supabase.from('listings').select('id, name, slug, city, tier, claimed')
      .ilike('name', `%${v.trim().replace(/[%_,()]/g, ' ')}%`).limit(8);
    setResults((data as Biz[]) || []);
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !email) return;
    if (!biz && !listingId) { setError('Please choose your business first.'); return; }
    setLoading(selectedPlan);
    setError('');
    track('checkout_start', { plan: selectedPlan, listing_slug: biz?.slug || listingId });
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, email, listingId: biz?.id || listingId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.needListing) { setBiz(null); setListingId(''); }
      setError(data.error || 'Something went wrong. Please try again.');
      track('checkout_error', { plan: selectedPlan, reason: String(data.error || '').slice(0, 80) });
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-gray-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Grow Your Business with <span className="text-orange-500">HireAnyPro</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. Upgrade anytime to get more leads and visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border-2 p-8 flex flex-col ${p.style} transition-shadow hover:shadow-lg`}
            >
              {p.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                    {p.badge}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-2">{p.name}</h2>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">{p.price}</span>
                <span className="text-gray-500">{p.period}</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">{p.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {p.ctaLink ? (
                <Link
                  href={p.ctaLink}
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${p.buttonStyle}`}
                >
                  {p.cta}
                </Link>
              ) : (
                <button
                  onClick={() => setSelectedPlan(p.plan!)}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${p.buttonStyle}`}
                >
                  {p.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Checkout form modal */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPlan(null)}>
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upgrade to {selectedPlan === 'pro' ? 'Pro' : 'Featured'}
              </h2>
              <p className="text-gray-600 mb-6">
                {selectedPlan === 'pro' ? '$9/month: quote requests straight to your inbox, contact info shown, ranked above free listings. Cancel anytime.' : '$49.99/month: top placement, homepage feature and highlighted card. Cancel anytime.'}
              </p>

              <form onSubmit={handleCheckout}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your business</label>
                {biz ? (
                  <div className="flex justify-between items-start bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div>
                      <div className="font-semibold text-gray-900">{biz.name}</div>
                      {biz.city && <div className="text-sm text-gray-600">{biz.city}, FL</div>}
                    </div>
                    <button type="button" onClick={() => { setBiz(null); setListingId(''); }} className="text-sm text-blue-800 hover:underline">Change</button>
                  </div>
                ) : owned.length > 1 ? (
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 mb-4" defaultValue=""
                    onChange={(e) => { const b = owned.find((o) => o.id === e.target.value) || null; setBiz(b); setListingId(b?.id || ''); }}>
                    <option value="" disabled>Choose one of your listings</option>
                    {owned.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                ) : (
                  <div className="mb-4">
                    <input type="text" value={q} onChange={(e) => search(e.target.value)} placeholder="Type your business name..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none text-gray-900" />
                    {results.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white shadow-sm max-h-56 overflow-y-auto">
                        {results.map((r) => (
                          <button type="button" key={r.id} onClick={() => { setBiz(r); setListingId(r.id); setResults([]); setQ(''); }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50">
                            <div className="font-medium text-gray-900 text-sm">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.city}{r.claimed ? ' · claimed' : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Not listed yet? <Link href="/contact" className="text-blue-800 hover:underline">Contact us</Link> and we&apos;ll add you.</p>
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  readOnly={signedIn}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none text-gray-900 mb-4"
                />

                {error && (
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    selectedPlan === 'pro'
                      ? 'bg-blue-800 text-white hover:bg-blue-700'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Connecting to Stripe...' : `Continue to Payment`}
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedPlan(null); setError(''); }}
                  className="w-full py-2 mt-3 text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Secure payment via Stripe. Cancel anytime.
              </p>
            </div>
          </div>
        )}

        <div className="text-center mt-12 text-sm text-gray-500">
          <p>All plans include a 14-day money-back guarantee. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
