'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isAutomatedBrowser } from '@/lib/track';

type Hit = { id: string; name: string; slug: string; city: string | null; claimed: boolean | null; categories: { name: string } | null };

/** "Find your business" box for owners: type a name (optionally ", city"), pick it, land on /claim with it preselected. */
export default function OwnerClaimFinder({ source }: { source: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setHits([]); setSearched(false); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const [name, city] = term.split(',').map((s) => s.trim());
      let query = supabase
        .from('listings')
        .select('id, name, slug, city, claimed, categories(name)')
        .ilike('name', `%${name.replace(/[%_]/g, '')}%`)
        .not('slug', 'like', 'zz-%')
        .order('review_count', { ascending: false, nullsFirst: false })
        .limit(8);
      if (city) query = query.ilike('city', `${city.replace(/[%_]/g, '')}%`);
      const { data } = await query;
      if (mine !== seq.current) return; // a newer search started
      setHits((data as unknown as Hit[]) || []);
      setSearched(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function pick(h: Hit) {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (!isAutomatedBrowser()) w.gtag?.('event', 'owner_search_select', { listing_slug: h.slug, source, already_claimed: !!h.claimed });
  }

  return (
    <div className="max-w-xl mx-auto text-left">
      <label htmlFor={`owner-finder-${source}`} className="sr-only">Your business name</label>
      <input
        id={`owner-finder-${source}`}
        type="search"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Your business name, e.g. Smith Plumbing, Tampa"
        className="w-full px-4 py-3 rounded-lg text-gray-900 bg-white border border-gray-300 focus:ring-2 focus:ring-orange-300 outline-none"
      />
      {hits.length > 0 && (
        <ul className="mt-2 bg-white rounded-lg shadow-lg divide-y divide-gray-100 overflow-hidden">
          {hits.map((h) => (
            <li key={h.id}>
              <a
                href={`/claim?listing=${encodeURIComponent(h.slug)}&utm_source=${encodeURIComponent(source)}&utm_medium=web&utm_campaign=owner_finder`}
                onClick={() => pick(h)}
                rel="nofollow"
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-orange-50"
              >
                <span>
                  <span className="block font-medium text-gray-900">{h.name}</span>
                  <span className="block text-xs text-gray-500">{[h.categories?.name, h.city].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`text-xs font-semibold whitespace-nowrap ${h.claimed ? 'text-gray-400' : 'text-orange-600'}`}>
                  {h.claimed ? 'Already claimed' : 'Claim free →'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {searched && hits.length === 0 && (
        <p className="mt-2 text-sm bg-white/90 text-gray-700 rounded-lg px-4 py-3">
          No match yet. Try fewer words, or <a href="/contact" className="text-orange-700 font-medium underline">ask us to add your business</a>.
        </p>
      )}
    </div>
  );
}
