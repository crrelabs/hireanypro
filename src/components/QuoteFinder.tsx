'use client';

import { useEffect, useMemo, useState } from 'react';
import CityQuoteForm from '@/components/CityQuoteForm';
import { isAutomatedBrowser } from '@/lib/track';

/**
 * "Get up to 3 free quotes" for visitors who aren't on a city page yet (home, category hubs, /search):
 * pick a service and a city, then the same multi-quote form as city pages (server picks the pros via /api/quote-multi).
 */
type Cat = { slug: string; name: string; icon?: string | null };
type City = { slug: string; name: string; state: string; count: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const label = (c: City) => (c.state && c.state !== 'FL' ? `${c.name}, ${c.state}` : c.name);
const catText = (n: string) => n.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');

export default function QuoteFinder({ categories, initialCategory, source, title, className = '' }: {
  categories: Cat[];
  initialCategory?: string;
  /** Where the finder sits: home | category | search. Sent to GA4 as form=<source>_multi_quote. */
  source: 'home' | 'category' | 'search';
  title?: string;
  className?: string;
}) {
  const [cat, setCat] = useState(initialCategory && categories.some((c) => c.slug === initialCategory) ? initialCategory : '');
  const [cityText, setCityText] = useState('');
  const [cities, setCities] = useState<City[] | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [err, setErr] = useState('');
  const [chosen, setChosen] = useState<{ cat: Cat; city: City } | null>(null);
  const [started, setStarted] = useState(false);

  const track = (name: string, p: Record<string, unknown> = {}) => {
    if (isAutomatedBrowser()) return;
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', name, { page_path: window.location.pathname, form: `${source}_multi_quote`, ...p });
  };

  useEffect(() => {
    if (!cat) { setCities(null); return; }
    let live = true;
    setCities(null); setLoadErr('');
    fetch(`/api/quote-cities?category=${encodeURIComponent(cat)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (live) setCities(d.cities || []); })
      .catch(() => { if (live) { setCities([]); setLoadErr('Could not load cities. Please try again.'); } });
    return () => { live = false; };
  }, [cat]);

  const matches = useMemo(() => {
    if (!cities) return [];
    const q = norm(cityText);
    if (!q) return cities.slice(0, 8);
    const starts = cities.filter((c) => norm(label(c)).startsWith(q));
    const has = cities.filter((c) => !norm(label(c)).startsWith(q) && norm(label(c)).includes(q));
    return [...starts, ...has].slice(0, 8);
  }, [cities, cityText]);

  const catObj = categories.find((c) => c.slug === cat);

  function pick(city: City) {
    if (!catObj) return;
    setErr('');
    setChosen({ cat: catObj, city });
    track('quote_finder_continue', { category: catObj.slug, city: city.slug });
  }

  function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!catObj) { setErr('Choose a service first.'); return; }
    if (!cities) { setErr('One moment, loading cities…'); return; }
    const q = norm(cityText.replace(/,\s*(fl|florida)$/i, ''));
    const exact = cities.find((c) => norm(c.name) === q || norm(label(c)) === q);
    const one = exact || (matches.length === 1 ? matches[0] : null);
    if (one) { pick(one); return; }
    setErr(q ? `We don't list ${catText(catObj.name)} pros in "${cityText}" yet. Pick a nearby city from the list.` : 'Type your city.');
  }

  const input = 'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none text-gray-900 bg-white';

  return (
    <section className={`rounded-xl border-2 border-orange-200 bg-orange-50 p-6 text-left ${className}`} aria-labelledby={`qf-${source}`}>
      {chosen ? (
        <>
          <button type="button" onClick={() => setChosen(null)} className="text-sm text-blue-800 hover:underline mb-3">← Change service or city</button>
          <CityQuoteForm compact formName={`${source}_multi_quote`} categorySlug={chosen.cat.slug} categoryName={chosen.cat.name}
            citySlug={chosen.city.slug} cityName={label(chosen.city)} />
        </>
      ) : (
        <>
          <h2 id={`qf-${source}`} className="text-xl font-bold text-gray-900">{title || 'Get up to 3 free quotes from top-rated local pros'}</h2>
          <p className="text-sm text-gray-600 mt-1 mb-4">Pick a service and your city, describe the job once, and we send it to up to 3 top-rated pros. Free, no obligation.</p>
          <form onSubmit={onContinue} onFocus={() => { if (!started) { setStarted(true); track('quote_finder_start'); } }} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={cat} onChange={(e) => { setCat(e.target.value); setErr(''); }} className={`${input} md:col-span-2`} aria-label="Service">
              <option value="">Choose a service…</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <div className="md:col-span-2 relative">
              <input type="text" value={cityText} onChange={(e) => { setCityText(e.target.value); setErr(''); }} placeholder={cat ? 'Your city (e.g. Miami)' : 'Your city'}
                className={input} aria-label="City" autoComplete="address-level2" disabled={!cat} />
              {cat && cities && cityText && matches.length > 0 && !matches.some((m) => norm(label(m)) === norm(cityText)) && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {matches.map((c) => (
                    <li key={c.slug}>
                      <button type="button" onClick={() => { setCityText(label(c)); pick(c); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-gray-900">
                        {label(c)} <span className="text-gray-400">· {c.count.toLocaleString('en-US')} {c.count === 1 ? 'pro' : 'pros'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors">Continue</button>
            {(err || loadErr) && <p className="text-red-600 text-sm md:col-span-5">{err || loadErr}</p>}
          </form>
        </>
      )}
    </section>
  );
}
