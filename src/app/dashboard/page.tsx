'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type DashboardData = {
  listings: Array<{
    id: string;
    name: string;
    slug: string;
    tier: string;
    rating: number;
    review_count: number;
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
  const emailParam = searchParams.get('email');
  const [email, setEmail] = useState(emailParam || '');
  const [loggedIn, setLoggedIn] = useState(!!emailParam);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async (e: string) => {
    setLoading(true);
    try {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', e)
        .single();

      if (!profile) {
        setData(null);
        setLoading(false);
        return;
      }

      // Get claimed listings via subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('listing_id, plan')
        .eq('profile_id', profile.id)
        .eq('status', 'active');

      const listingIds = (subs || []).map((s) => s.listing_id).filter(Boolean);
      const planMap = Object.fromEntries((subs || []).map((s) => [s.listing_id, s.plan]));

      let listings: DashboardData['listings'] = [];
      if (listingIds.length > 0) {
        const { data: listingData } = await supabase
          .from('listings')
          .select('id, name, slug, tier, rating, review_count')
          .in('id', listingIds);
        listings = (listingData || []).map((l) => ({ ...l, tier: planMap[l.id] || l.tier }));
      }

      // Get inquiries
      let inquiries: DashboardData['inquiries'] = [];
      let totalInquiries = 0;
      let monthInquiries = 0;
      if (listingIds.length > 0) {
        const { data: inqData } = await supabase
          .from('inquiries')
          .select('id, name, email, message, created_at, listing_id')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false })
          .limit(20);
        inquiries = inqData || [];
        totalInquiries = inquiries.length;

        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthInquiries = inquiries.filter((i) => new Date(i.created_at) > monthAgo).length;
      }

      setData({ listings, inquiries, totalInquiries, monthInquiries });
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn && email) loadDashboard(email);
  }, [loggedIn, email, loadDashboard]);

  if (!loggedIn) {
    return (
      <div className="max-w-md mx-auto py-20 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Business Dashboard</h1>
        <label className="block text-sm font-medium text-gray-700 mb-2">Enter your email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent mb-4 text-gray-900"
          onKeyDown={(e) => e.key === 'Enter' && email && setLoggedIn(true)}
        />
        <button
          onClick={() => email && setLoggedIn(true)}
          className="w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          View Dashboard
        </button>
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

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
        <span className="text-sm text-gray-500">{email}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Claimed Listings</div>
          <div className="text-2xl font-bold text-gray-900">{data.listings.length}</div>
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
                  ⭐ {l.rating.toFixed(1)} ({l.review_count} reviews)
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  l.tier === 'featured' ? 'bg-orange-100 text-orange-700' :
                  l.tier === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {l.tier}
                </span>
                <Link href={`/dashboard/edit/${l.id}?email=${encodeURIComponent(email)}`} className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 font-medium transition-colors">
                  Edit
                </Link>
                {l.tier === 'free' && (
                  <Link href={`/pricing?listing=${l.id}`} className="text-sm bg-blue-800 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
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
                <Link href="/pricing" className="inline-block bg-blue-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  Upgrade to Pro — $49/mo
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
                    <Link href="/pricing" className="bg-blue-800 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-lg">
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
