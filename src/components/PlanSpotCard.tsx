'use client';

import { useEffect, useRef, useState } from 'react';
import { isAutomatedBrowser, onHuman } from '@/lib/track';

type Spot = {
  available: boolean;
  name?: string;
  city?: string | null;
  category?: string | null;
  cityPage?: string | null;
  cityCount?: number;
  rank?: number | null;
  proCount?: number;
  featuredCount?: number;
  tier?: string;
};

const lower = (n: string) => n.split(' ').map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');

/**
 * Shown on /pricing when the visitor arrives for a specific listing (upsell emails, dashboard, claim success).
 * Public facts only: rank by Google reviews among same-category pros in the city, and how many are Pro/Featured.
 * City pages sort Featured first, then Pro, then free, so this is what each plan would change for them.
 */
export default function PlanSpotCard({ listing, onPick }: { listing: string; onPick: (plan: 'pro' | 'featured') => void }) {
  const [s, setS] = useState<Spot | null>(null);
  const tracked = useRef(false);
  useEffect(() => {
    let live = true;
    fetch(`/api/plan-preview?listing=${encodeURIComponent(listing)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.available) setS(j); })
      .catch(() => {});
    return () => { live = false; };
  }, [listing]);
  useEffect(() => {
    if (!s || tracked.current || isAutomatedBrowser()) return;
    return onHuman(() => {
      if (tracked.current) return;
      tracked.current = true;
      const w = window as unknown as { gtag?: (...a: unknown[]) => void };
      w.gtag?.('event', 'plan_spot_view', { listing_slug: listing, rank: s.rank || 0, plan: s.tier || '' });
    });
  }, [s, listing]);
  if (!s || !s.cityCount || s.cityCount < 2 || !s.city) return null;
  if (s.tier === 'featured') return null;

  const cat = s.category ? lower(s.category) : 'home service';
  const paid = (s.proCount || 0) + (s.featuredCount || 0);
  const list = s.cityPage
    ? <a href={s.cityPage} className="text-blue-800 underline">{s.cityCount} {cat} pros in {s.city}</a>
    : <>{s.cityCount} {cat} pros in {s.city}</>;
  return (
    <div className="max-w-3xl mx-auto mb-10 bg-white border border-gray-200 rounded-2xl p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-1">Your spot in {s.city}</p>
      <ul className="text-sm text-gray-700 space-y-1.5 mb-4">
        {s.rank && <li>• Homeowners compare {s.name} with {list}. You rank <b>#{s.rank}</b> of {s.cityCount} by Google reviews.</li>}
        <li>• Our {s.city} {cat} page lists Featured pros first, then Pro, then free listings.
          {paid === 0
            ? <> Right now <b>none</b> of the {s.cityCount} {s.cityCount === 1 ? 'pro is' : 'pros are'} on Pro or Featured, so upgrading puts you at the top of the list.</>
            : <> Right now {paid} of {s.cityCount} {paid === 1 ? 'is' : 'are'} on a paid plan{s.featuredCount ? ` (${s.featuredCount} Featured)` : ''}.</>}
        </li>
        {s.tier === 'pro'
          ? <li>• You&apos;re on Pro. {s.featuredCount ? 'Featured adds the highlighted top card and the homepage.' : <>The Featured top spot in {s.city} is <b>open</b>.</>}</li>
          : !s.featuredCount && <li>• The Featured top spot for {cat} in {s.city} is <b>open</b>.</li>}
      </ul>
      <div className="flex flex-col sm:flex-row gap-3">
        {s.tier !== 'pro' && (
          <button onClick={() => onPick('pro')} className="bg-blue-800 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg">Rank above free listings: Pro $9/mo</button>
        )}
        <button onClick={() => onPick('featured')} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg">Take the top spot: Featured $49.99/mo</button>
      </div>
    </div>
  );
}
