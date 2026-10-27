'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SmsToggle from './SmsToggle';

type DashboardData = {
  listings: Array<{
    id: string;
    name: string;
    slug: string;
    tier: string;
    rating: number;
    review_count: number;
    smsPhone?: string | null;
    views30?: number;
  }>;
  inquiries: Array<{
    id: string;
    name: string;
    email: string;
    message: string;
    created_at: string;
    listing_id: string;
  }>;
  totalInquiries: number;
  monthInquiries: number;
  views30: number;
};

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-20 px-4 text-center text-gray-500">Loading...</div>}>
      <DashboardPage />
    </Suspense>
  );
}

function DashboardPage() {
  const searchParams = useSearchParams();
  const loginState = searchParams.get('login');
  const paid = !!searchParams.get('session_id');
  const [email, setEmail] = useState('');
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Identity comes from the signed session cookie, never from a URL or form field.
      const res = await fetch('/api/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.status === 401) { setAuthed(false); setData(null); return; }
      if (!res.ok) { setData(null); return; }
      const result = await res.json();
      setAuthed(true);
      setEmail(result.email || '');
      setData({
        listings: result.listings || [],
        inquiries: result.inquiries || [],
        totalInquiries: result.totalInquiries || 0,
        monthInquiries: result.monthInquiries || 0,
        views30: result.views30 || 0,
      });
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  async function sendLink() {
    if (!email) return;
    setSending(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await res.json();
      if (j.success) setLinkSent(true); else setLoginError(j.error || 'Something went wrong.');
    } catch { setLoginError('Connection error. Please try again.'); }
    finally { setSending(false); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthed(false); setData(null); setEmail(''); setLinkSent(false);
  }

  if (authed === false) {
    if (linkSent) {
      return (
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-4">If <strong>{email}</strong> manages a claimed listing, we just sent it a one-click sign-in link. It works for 24 hours.</p>
          <p className="text-sm text-gray-500">No email? Check spam, or <button onClick={() => setLinkSent(false)} className="text-blue-800 hover:underline">try another address</button>. Haven&apos;t claimed yet? <Link href="/claim" className="text-blue-800 hover:underline">Claim your listing</Link>.</p>
        </div>
      );
    }
    return (
      <div className="max-w-md mx-auto py-20 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Business Dashboard</h1>
        {paid && <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm mb-4 text-center">Payment received, thank you! Sign in below to see your upgraded listing.</p>}
        {loginState === 'expired' && <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-4 text-center">That sign-in link expired. Enter your email for a new one.</p>}
        <p className="text-gray-600 text-sm mb-6 text-center">Enter the email you used to claim your listing and we&apos;ll send you a secure one-click sign-in link.</p>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent mb-4 text-gray-900"
          onKeyDown={(e) => e.key === 'Enter' && sendLink()}
        />
        {loginError && <p className="text-red-600 text-sm mb-4">{loginError}</p>}
        <button
          onClick={sendLink}
          disabled={sending || !email}
          className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Email Me a Sign-In Link'}
        </button>
        <p className="text-sm text-gray-500 text-center mt-4">Not listed yet? <Link href="/claim" className="text-blue-800 hover:underline">Claim your free listing</Link></p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="text-gray-500">Loading your dashboard...</div>
      </div>
    );
  }

  if (!data || data.listings.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">No Listings Found</h1>
        <p className="text-gray-600 mb-6">We couldn&apos;t find any claimed listings for {email}.</p>
        <Link href="/claim" className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Claim a Listing
        </Link>
      </div>
    );
  }

  const isFree = data.listings.every((l) => l.tier === 'free');
  const lockedListing = data.inquiries[0]?.listing_id || data.listings.find((l) => l.tier === 'free')?.id || '';

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
        <span className="text-sm text-gray-500">{email} · <button onClick={logout} className="text-blue-800 hover:underline">Sign out</button></span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Claimed Listings</div>
          <div className="text-2xl font-bold text-gray-900">{data.listings.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Page Views (30 days)</div>
          <div className="text-2xl font-bold text-gray-900">{data.views30}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Inquiries</div>
          <div className="text-2xl font-bold text-gray-900">{data.totalInquiries}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">This Month</div>
          <div className="text-2xl font-bold text-gray-900">{data.monthInquiries}</div>
        </div>
      </div>

      {/* Listings */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Listings</h2>
        <div className="space-y-3">
          {data.listings.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <Link href={`/listing/${l.slug}`} className="font-semibold text-gray-900 hover:text-blue-800">
                  {l.name}
                </Link>
                <div className="text-sm text-gray-500 mt-1">
                  {l.rating ? <>⭐ {Number(l.rating).toFixed(1)} ({l.review_count || 0} {l.review_count === 1 ? 'review' : 'reviews'}) · </> : null}👀 {l.views30 || 0} {l.views30 === 1 ? 'view' : 'views'} in the last 30 days
                </div>
                {l.tier === 'free' && (l.views30 || 0) >= 3 && (
                  <div className="text-sm text-gray-700 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    {l.views30} people looked at your listing this month, but free listings hide your phone and website.{' '}
                    <Link href={`/pricing?plan=pro&listing=${l.id}&utm_source=dashboard&utm_medium=web&utm_campaign=views_nudge`} className="text-blue-800 font-semibold hover:underline">Show them with Pro ($9/mo)</Link>
                  </div>
                )}
                <SmsToggle listingId={l.id} initialPhone={l.smsPhone || null} />
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  l.tier === 'featured' ? 'bg-orange-100 text-orange-700' :
                  l.tier === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {l.tier}
                </span>
                {/* Every owner can edit (free included): claiming promises "correct your phone, hours, services and description". */}
                {(
                  <Link href={`/dashboard/edit/${l.id}`} className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 font-medium transition-colors">
                    Edit
                  </Link>
                )}
                {l.tier === 'free' && (
                  <Link href={`/pricing?plan=pro&listing=${l.id}&utm_source=dashboard&utm_medium=web&utm_campaign=upgrade_button`} className="text-sm bg-blue-800 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                    Upgrade
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inquiries */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Inquiries ({data.totalInquiries})</h2>
        {data.inquiries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No inquiries yet. They&apos;ll show up here when customers reach out.
          </div>
        ) : isFree ? (
          /* FREE TIER: Show inquiry count but blur details */
          <div>
            <div className="bg-gradient-to-b from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl p-6 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">🔒 {data.totalInquiries} Lead{data.totalInquiries !== 1 ? 's' : ''} Waiting</div>
                <p className="text-gray-700 mb-4">Customers are looking for your services! Upgrade to Pro to see their contact info and respond directly.</p>
                <Link href={`/pricing?plan=pro${lockedListing ? `&listing=${lockedListing}` : ''}&utm_source=dashboard&utm_medium=web&utm_campaign=locked_lead`} className="inline-block bg-blue-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  Upgrade to Pro — $9/mo
                </Link>
                <p className="text-xs text-gray-500 mt-2">See who&apos;s looking for you. Respond to leads. Grow your business.</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.inquiries.map((inq) => (
                <div key={inq.id} className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">New Inquiry</div>
                    <div className="text-xs text-gray-400">
                      {new Date(inq.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
                    <div className="text-sm text-gray-500 mb-1">customer@email.com</div>
                    <div className="text-sm text-gray-700">I need help with a project at my home in Miami. Can you provide a quote for...</div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <Link href={`/pricing?plan=pro${lockedListing ? `&listing=${lockedListing}` : ''}&utm_source=dashboard&utm_medium=web&utm_campaign=locked_lead`} className="bg-blue-800 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                      🔓 Upgrade to See This Lead
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* PAID TIER: Show full inquiry details */
          <div className="space-y-3">
            {data.inquiries.map((inq) => (
              <div key={inq.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-gray-900">{inq.name}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-1">{inq.email}</div>
                <div className="text-sm text-gray-700">{inq.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
