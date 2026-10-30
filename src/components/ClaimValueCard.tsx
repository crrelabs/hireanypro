'use client';

import { useEffect, useRef, useState } from 'react';
import { isAutomatedBrowser, onHuman } from '@/lib/track';

type Preview = {
  available: boolean;
  name?: string;
  city?: string | null;
  category?: string | null;
  cityPage?: string | null;
  views30?: number;
  cityCount?: number;
  rank?: number | null;
  claimedInCity?: number;
  missing?: { website: boolean; hours: boolean; description: boolean; phone: boolean };
};

const lower = (n: string) => n.split(' ').map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');

/**
 * "Your listing today": real facts that give an owner a reason to claim (views, rank among local competitors,
 * how many competitors already claimed, and what is missing or generic on the listing). Shown on /claim for the
 * selected unclaimed listing and in the owner banner on listing pages. Renders nothing until data arrives.
 */
export default function ClaimValueCard({ listing, surface, compact = false }: { listing: string; surface: string; compact?: boolean }) {
  const [p, setP] = useState<Preview | null>(null);
  const tracked = useRef(false);
  useEffect(() => {
    let live = true;
    fetch(`/api/claim-preview?listing=${encodeURIComponent(listing)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.available) setP(j); })
      .catch(() => {});
    return () => { live = false; };
  }, [listing]);
  useEffect(() => {
    if (!p || tracked.current || isAutomatedBrowser()) return;
    return onHuman(() => {
      if (tracked.current) return;
      tracked.current = true;
      const w = window as unknown as { gtag?: (...a: unknown[]) => void };
      w.gtag?.('event', 'claim_value_view', { surface, listing_slug: listing, views30: p.views30 || 0, rank: p.rank || 0 });
    });
  }, [p, surface, listing]);
  if (!p) return null;

  const cat = p.category ? lower(p.category) : 'home service';
  const facts: React.ReactNode[] = [];
  if ((p.views30 || 0) >= 1) {
    facts.push(<><b>{p.views30}</b> {p.views30 === 1 ? 'person' : 'people'} viewed this listing in the last 30 days.</>);
  }
  if (p.rank && p.cityCount && p.cityCount > 1 && p.city) {
    const list = p.cityPage ? <a href={p.cityPage} className="text-blue-800 underline">{p.cityCount} {cat} pros in {p.city}</a> : <>{p.cityCount} {cat} pros in {p.city}</>;
    facts.push(<>Homeowners compare you with {list}. You rank <b>#{p.rank}</b> by Google reviews.</>);
  }
  if (p.city && p.cityCount && p.cityCount > 1) {
    facts.push(p.claimedInCity
      ? <>{p.claimedInCity} of them {p.claimedInCity === 1 ? 'has' : 'have'} already claimed their listing.</>
      : <>No {cat} business in {p.city} has claimed its listing yet. Be the first.</>);
  }
  const m = p.missing;
  const gaps = m ? [
    m.description && 'a generic description (we wrote it from public data)',
    m.hours && 'no opening hours',
    m.website && 'no website link',
    m.phone && 'no phone number',
  ].filter(Boolean) as string[] : [];

  if (!facts.length && !gaps.length) return null;
  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${compact ? 'p-3 mt-3' : 'p-4 mb-6'} text-sm text-gray-700`}>
      {!compact && <p className="font-semibold text-gray-900 mb-2">Your listing today</p>}
      <ul className="space-y-1">
        {facts.map((f, i) => <li key={i} className="flex gap-2"><span aria-hidden="true">•</span><span>{f}</span></li>)}
        {gaps.length > 0 && (
          <li className="flex gap-2"><span aria-hidden="true">•</span><span>Right now it shows {gaps.join(', ')}. After claiming, you can fix that in a minute.</span></li>
        )}
      </ul>
    </div>
  );
}
