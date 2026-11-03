import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/components/Breadcrumbs';
import QuoteFinder from '@/components/QuoteFinder';
import { getCountyData, countySlug, stateName } from '@/lib/geo';
import { getHubCities, getHubCity, hubHref, type HubCity } from '@/lib/city-hubs';
import { faqPageJsonLd, formatCount, listJoin, lowerCategory, shouldIndexCityPage } from '@/lib/directory-content';
import { prosLabel } from '@/lib/pros-label';
import { clampDescription } from '@/lib/meta';

export const revalidate = 3600;

// ISR: rendered on first request, cached for an hour. Next 16 ignores revalidate without generateStaticParams.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ city: string }> };

type Row = {
  name: string;
  slug: string;
  rating: number | null;
  review_count: number | null;
  claimed: boolean | null;
  categories: { name: string; slug: string; icon: string } | null;
};

type Pro = { name: string; slug: string; rating: number; reviews: number };
type Service = { name: string; slug: string; icon: string; count: number; avg: number | null; reviews: number; top: Pro[] };

const MIN_REVIEWS_TOP = 5;
const MIN_RATING_TOP = 4;

function plural(n: number, one: string, many: string) {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** Every number on a city hub comes from the city's live listings (nothing hardcoded). */
const loadHub = cache(async (slug: string) => {
  const hub = await getHubCity(slug);
  if (!hub) return null;
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('name, slug, rating, review_count, claimed, categories(name, slug, icon)')
      .in('city', hub.variants)
      .eq('state', hub.state)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(`city hub ${slug}: ${error.message}`); // never cache a cut-short hub
    if (!data?.length) break;
    rows.push(...(data as unknown as Row[]).filter((r) => !r.slug.startsWith('zz-hap-test')));
    if (data.length < 1000) break;
  }
  if (!rows.length) return null;

  const svc = new Map<string, Service & { weighted: number; rows: Row[] }>();
  let rated = 0, reviews = 0, weighted = 0, claimed = 0;
  for (const r of rows) {
    const rc = Number(r.review_count) || 0;
    if (r.claimed) claimed += 1;
    if (r.rating && rc > 0) { rated += 1; reviews += rc; weighted += Number(r.rating) * rc; }
    if (!r.categories) continue;
    const s = svc.get(r.categories.slug) || { ...r.categories, count: 0, avg: null, reviews: 0, top: [], weighted: 0, rows: [] };
    s.count += 1;
    if (r.rating && rc > 0) { s.reviews += rc; s.weighted += Number(r.rating) * rc; }
    s.rows.push(r);
    svc.set(r.categories.slug, s);
  }
  const services: Service[] = [...svc.values()].map((s) => {
    const seen = new Set<string>();
    // Same order as the city x service page: most reviews first, then rating.
    const top = s.rows
      .filter((r) => (Number(r.review_count) || 0) >= MIN_REVIEWS_TOP && Number(r.rating) >= MIN_RATING_TOP)
      .sort((a, b) => (Number(b.review_count) || 0) - (Number(a.review_count) || 0) || Number(b.rating) - Number(a.rating))
      .filter((r) => { const k = r.name.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 3)
      .map((r) => ({ name: r.name, slug: r.slug, rating: Number(r.rating), reviews: Number(r.review_count) }));
    return { name: s.name, slug: s.slug, icon: s.icon, count: s.count, reviews: s.reviews, avg: s.reviews ? s.weighted / s.reviews : null, top };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const seen = new Set<string>();
  const topPros = rows
    .filter((r) => (Number(r.review_count) || 0) >= 20 && Number(r.rating) >= 4.5)
    .sort((a, b) => Number(b.rating) - Number(a.rating) || (Number(b.review_count) || 0) - (Number(a.review_count) || 0))
    .filter((r) => { const k = r.name.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 10);

  const countyMap = hub.state === 'FL' ? await getCountyData() : null;
  const county = countyMap ? countyMap.primary[hub.name.toLowerCase()] || null : null;
  const all = await getHubCities();
  const nearby: HubCity[] = (county && countyMap
    ? all.filter((c) => c.slug !== hub.slug && c.state === 'FL' && countyMap.primary[c.name.toLowerCase()] === county)
    : all.filter((c) => c.slug !== hub.slug && c.state === hub.state)
  ).slice(0, 12);

  return { hub, total: rows.length, services, topPros, rated, reviews, claimed, avg: reviews ? weighted / reviews : null, county, nearby };
});

function titleFor(name: string, st: string, total: number) {
  const base = `Home Service Pros in ${name}, ${st}: ${formatCount(total)} Listed (${new Date().getFullYear()})`;
  return base.length + ' | HireAnyPro'.length <= 65 ? `${base} | HireAnyPro` : base;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const data = await loadHub(city);
  if (!data) return { title: 'City Not Found' };
  const { hub, total, services, avg, reviews } = data;
  const title = titleFor(hub.name, hub.state, total);
  const ratingBit = avg ? ` Average rating ${avg.toFixed(1)}/5 across ${formatCount(reviews)} Google reviews.` : '';
  const description = clampDescription(`Compare ${plural(total, 'local pro', 'local pros')} in ${hub.name}, ${stateName(hub.state)}: ${listJoin(services.slice(0, 3).map((s) => lowerCategory(s.name)))} and more.${ratingBit} Free quotes.`);
  const url = `https://hireanypro.com/cities/${city}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'HireAnyPro', images: [{ url: '/logo.png', alt: 'HireAnyPro' }] },
  };
}

export default async function CityHubPage({ params }: Props) {
  const { city } = await params;
  const data = await loadHub(city);
  if (!data) notFound();
  const { hub, total, services, topPros, rated, reviews, claimed, avg, county, nearby } = data;
  const st = stateName(hub.state);
  const place = `${hub.name}, ${hub.state}`;
  const linkable = services.filter((s) => shouldIndexCityPage(s.count));
  const top3 = services.slice(0, 3);
  const { data: cats } = await supabase.from('categories').select('slug, name, icon').order('name');

  const faqs: { q: string; a: string }[] = [
    {
      q: `How many home service pros are listed in ${hub.name}?`,
      a: `HireAnyPro lists ${plural(total, 'home service business', 'home service businesses')} in ${place}, across ${plural(services.length, 'service', 'services')}. ${linkable.length} of those services have a full page comparing at least 3 local pros.`,
    },
    {
      q: `What are the most common home services in ${hub.name}?`,
      a: `The largest categories are ${listJoin(top3.map((s) => `${lowerCategory(s.name)} (${formatCount(s.count)})`))}.`,
    },
    {
      q: `How are ${hub.name} pros rated?`,
      a: avg
        ? `${plural(rated, 'listing has', 'listings have')} public Google ratings, with a review-weighted average of ${avg.toFixed(1)} out of 5 across ${formatCount(reviews)} reviews.${topPros[0] ? ` ${topPros[0].name} is among the highest rated, at ${Number(topPros[0].rating).toFixed(1)} stars from ${formatCount(Number(topPros[0].review_count))} reviews.` : ''}`
        : '',
    },
    ...top3.filter((s) => s.top[0]).map((s) => ({
      q: `Which ${prosLabel(lowerCategory(s.name))} in ${hub.name} have the most reviews?`,
      a: `By Google review count: ${listJoin(s.top.map((p) => `${p.name} (${p.rating.toFixed(1)} stars, ${formatCount(p.reviews)} reviews)`))}. Review counts and ratings come from public Google data and can change.`,
    })),
    {
      q: `How do I get quotes from ${hub.name} pros?`,
      a: `Pick a service in the quote box on this page, describe the job once, and HireAnyPro sends it to up to 3 top-rated local pros. You can also open any listing and call or request a quote directly. It is free for homeowners.`,
    },
  ].filter((f) => f.a);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Cities', href: '/cities' },
    ...(county ? [{ label: `${county} County`, href: `/region/${countySlug(county)}` }] : []),
    { label: hub.name },
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.label,
        ...(b.href ? { item: `https://hireanypro.com${b.href === '/' ? '' : b.href}` } : {}),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Home services in ${hub.name}, ${st}`,
      numberOfItems: linkable.length,
      itemListElement: linkable.map((s, i) => ({
        '@type': 'ListItem', position: i + 1, name: `${s.name} in ${hub.name}`, url: `https://hireanypro.com/services/${s.slug}/${hub.slug}`,
      })),
    },
    faqPageJsonLd(faqs),
  ];

  const stats = [
    { label: 'Pros listed', value: formatCount(total) },
    { label: 'Services', value: formatCount(services.length) },
    { label: 'Avg. Google rating', value: avg ? `${avg.toFixed(1)} ★` : 'n/a', detail: reviews ? `${formatCount(reviews)} reviews` : undefined },
    { label: 'Claimed by owner', value: formatCount(claimed) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Home Service Pros in {hub.name}, {st}</h1>
        <p className="text-gray-700 max-w-3xl mb-6">
          HireAnyPro lists {plural(total, 'local business', 'local businesses')} in {hub.name}
          {top3.length > 0 && <>, led by {listJoin(top3.map((s) => `${lowerCategory(s.name)} (${formatCount(s.count)})`))}</>}.
          {avg && <> Rated listings average {avg.toFixed(1)} out of 5 across {formatCount(reviews)} Google reviews.</>}
          {county && <> {hub.name} is in {county} County.</>}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
              {s.detail && <div className="text-xs text-gray-400 mt-1">{s.detail}</div>}
            </div>
          ))}
        </div>

        <QuoteFinder
          categories={(cats || []).filter((c) => services.some((s) => s.slug === c.slug))}
          initialCity={hub.state !== 'FL' ? `${hub.name}, ${hub.state}` : hub.name}
          source="city_hub"
          title={`Get up to 3 free quotes from ${hub.name} pros`}
          className="mb-10"
        />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Services in {hub.name}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => {
              const href = shouldIndexCityPage(s.count) ? `/services/${s.slug}/${hub.slug}` : null;
              return (
                <div key={s.slug} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{s.icon}</span>
                    {href ? (
                      <Link href={href} className="font-semibold text-gray-900 hover:text-blue-800">{s.name} in {hub.name}</Link>
                    ) : (
                      <span className="font-semibold text-gray-900">{s.name}</span>
                    )}
                    <span className="text-sm text-gray-500 ml-auto">{formatCount(s.count)}</span>
                  </div>
                  {s.avg && <p className="text-xs text-gray-500 mb-2">Avg. {s.avg.toFixed(1)} ★ across {formatCount(s.reviews)} reviews</p>}
                  {s.top.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {s.top.map((p) => (
                        <li key={p.slug} className="flex justify-between gap-2">
                          <Link href={`/listing/${p.slug}`} className="text-blue-800 hover:underline truncate">{p.name}</Link>
                          <span className="text-gray-500 whitespace-nowrap">{p.rating.toFixed(1)} ★ ({formatCount(p.reviews)})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {href && (
                    <Link href={href} className="inline-block mt-3 text-sm text-blue-800 font-medium hover:underline">
                      Compare all {formatCount(s.count)} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3">Pros under each service: rated {MIN_RATING_TOP}.0+ with the most Google reviews (at least {MIN_REVIEWS_TOP}).</p>
        </section>

        {topPros.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top-rated pros in {hub.name}</h2>
            <ol className="grid md:grid-cols-2 gap-3">
              {topPros.map((p, i) => (
                <li key={p.slug} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-5">{i + 1}.</span>
                  <div>
                    <Link href={`/listing/${p.slug}`} className="font-semibold text-blue-800 hover:underline">{p.name}</Link>
                    <div className="text-sm text-gray-600">
                      {Number(p.rating).toFixed(1)} ★ · {formatCount(Number(p.review_count))} reviews
                      {p.categories && <> · {p.categories.name}</>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-gray-500 mt-2">Ranked by Google rating among listings with at least 20 reviews.</p>
          </section>
        )}

        {nearby.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{county ? `Other ${county} County cities` : `Other ${st} cities`}</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((c) => (
                <Link key={c.slug} href={hubHref(c.slug)} className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors">
                  {c.name}{c.state !== 'FL' ? `, ${c.state}` : ''} ({formatCount(c.total)})
                </Link>
              ))}
            </div>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="mb-10 max-w-3xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{hub.name} home services FAQ</h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="font-medium text-gray-900">{f.q}</h3>
                  <p className="text-gray-700 text-sm mt-1">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="p-6 bg-blue-50 rounded-xl space-y-2">
          {county && (
            <p className="text-gray-700">
              <Link href={`/region/${countySlug(county)}`} className="text-blue-800 font-semibold hover:underline">All home services in {county} County</Link>
            </p>
          )}
          <p className="text-gray-700">
            Own a business in {hub.name}?{' '}
            <Link href="/for-pros?src=city_hub" className="text-blue-800 font-semibold hover:underline">Find your listing and claim it free</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
