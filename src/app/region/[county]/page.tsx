import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAllCounties, countyFromSlug, citySlug } from '@/lib/geo';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  MIN_INDEXABLE_CITY_LISTINGS,
  faqPageJsonLd,
  formatCount,
  listJoin,
  lowerCategory,
} from '@/lib/directory-content';

export const revalidate = 3600;

// ISR: nothing prerendered at build time; each county renders on first request and is cached for an hour.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ county: string }> };

type Row = {
  name: string;
  slug: string;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  categories: { name: string; slug: string; icon: string } | null;
};

type CityCount = { name: string; slug: string; count: number };
type CategoryBlock = { name: string; slug: string; icon: string; count: number; cities: CityCount[] };

function plural(n: number, one: string, many: string) {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** All the numbers on a county hub, computed from the county's live listings (nothing hardcoded). */
const loadCounty = cache(async (slug: string) => {
  const counties = await getAllCounties();
  const countyName = countyFromSlug(slug, counties);
  if (!countyName) return null;

  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('listings')
      .select('name, slug, city, rating, review_count, categories(name, slug, icon)')
      .eq('state', 'FL') // county hubs are Florida-only
      .eq('county', countyName)
      .order('id')
      .range(from, from + 999);
    if (!data?.length) break;
    rows.push(...(data as unknown as Row[]).filter((r) => !r.slug.startsWith('zz-')));
    if (data.length < 1000) break;
  }

  const cityTotals = new Map<string, CityCount>();
  const catMap = new Map<string, { name: string; slug: string; icon: string; count: number; cities: Map<string, CityCount> }>();
  let rated = 0;
  let reviews = 0;
  let weighted = 0;
  for (const r of rows) {
    const city = (r.city || '').trim();
    if (city) {
      const key = citySlug(city);
      const c = cityTotals.get(key) || { name: city, slug: key, count: 0 };
      c.count += 1;
      cityTotals.set(key, c);
    }
    if (r.categories) {
      const cat = catMap.get(r.categories.slug) || { ...r.categories, count: 0, cities: new Map() };
      cat.count += 1;
      if (city) {
        const key = citySlug(city);
        const cc = cat.cities.get(key) || { name: city, slug: key, count: 0 };
        cc.count += 1;
        cat.cities.set(key, cc);
      }
      catMap.set(r.categories.slug, cat);
    }
    const rc = Number(r.review_count) || 0;
    if (r.rating && rc > 0) {
      rated += 1;
      reviews += rc;
      weighted += Number(r.rating) * rc;
    }
  }

  const categories: CategoryBlock[] = [...catMap.values()]
    .map((c) => ({ ...c, cities: [...c.cities.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const cities = [...cityTotals.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Top-rated: enough reviews to mean something, one entry per business name.
  const seen = new Set<string>();
  const topPros = rows
    .filter((r) => (Number(r.review_count) || 0) >= 20 && Number(r.rating) >= 4.5)
    .sort((a, b) => Number(b.rating) - Number(a.rating) || (Number(b.review_count) || 0) - (Number(a.review_count) || 0))
    .filter((r) => {
      const k = r.name.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 10);

  return {
    countyName,
    total: rows.length,
    cities,
    categories,
    topPros,
    rated,
    reviews,
    avgRating: reviews ? weighted / reviews : null,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county } = await params;
  const data = await loadCounty(county);
  if (!data) return { title: 'Region Not Found' };
  const { countyName, total, categories, avgRating, reviews } = data;
  const topCats = listJoin(categories.slice(0, 3).map((c) => lowerCategory(c.name)));
  const ratingBit = avgRating ? ` Average rating ${avgRating.toFixed(1)}/5 across ${formatCount(reviews)} Google reviews.` : '';
  const title = `${countyName} County, FL Home Service Pros (${formatCount(total)} Listed) | HireAnyPro`;
  const description = `Compare ${plural(total, 'local pro', 'local pros')} in ${countyName} County, Florida, including ${topCats}.${ratingBit} Request free quotes.`;
  const url = `https://hireanypro.com/region/${county}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'HireAnyPro' },
  };
}

export default async function RegionPage({ params }: Props) {
  const { county } = await params;
  const data = await loadCounty(county);
  if (!data) notFound();
  const { countyName, total, cities, categories, topPros, rated, reviews, avgRating } = data;

  // A city/category link is only worth following when the target page is indexable (3+ listings). Counts here are
  // county-local, which never exceed the city page's own count, so a link shown here never lands on a thin page.
  const linkable = (n: number) => n >= MIN_INDEXABLE_CITY_LISTINGS;
  const bestCategoryFor = (citySlugValue: string) =>
    categories
      .map((cat) => ({ cat, n: cat.cities.find((c) => c.slug === citySlugValue)?.count || 0 }))
      .filter((x) => linkable(x.n))
      .sort((a, b) => b.n - a.n)[0]?.cat;

  const topCats = categories.slice(0, 3);
  const topCities = cities.slice(0, 3);
  const faqs: { q: string; a: string }[] = [
    {
      q: `How many home service pros are listed in ${countyName} County?`,
      a: `HireAnyPro lists ${plural(total, 'home service business', 'home service businesses')} in ${countyName} County, Florida, across ${plural(categories.length, 'service category', 'service categories')} and ${plural(cities.length, 'city or town', 'cities and towns')}.`,
    },
    {
      q: `Which ${countyName} County cities have the most pros?`,
      a: topCities.length
        ? `${listJoin(topCities.map((c) => `${c.name} (${formatCount(c.count)})`))} have the most listings in ${countyName} County.`
        : '',
    },
    {
      q: `What services are most common in ${countyName} County?`,
      a: topCats.length
        ? `The largest categories are ${listJoin(topCats.map((c) => `${lowerCategory(c.name)} (${formatCount(c.count)})`))}.`
        : '',
    },
    {
      q: `How are ${countyName} County pros rated?`,
      a: avgRating
        ? `${plural(rated, 'listing has', 'listings have')} public Google ratings, with a review-weighted average of ${avgRating.toFixed(1)} out of 5 across ${formatCount(reviews)} reviews.${topPros[0] ? ` ${topPros[0].name} is among the highest rated, at ${Number(topPros[0].rating).toFixed(1)} stars from ${formatCount(Number(topPros[0].review_count))} reviews.` : ''}`
        : '',
    },
    {
      q: `How do I get a quote from a ${countyName} County pro?`,
      a: `Open any listing and use the free quote form, or call the business directly. HireAnyPro does not charge homeowners anything to search, compare or request quotes.`,
    },
  ].filter((f) => f.a);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hireanypro.com' },
        { '@type': 'ListItem', position: 2, name: `${countyName} County`, item: `https://hireanypro.com/region/${county}` },
      ],
    },
    faqPageJsonLd(faqs),
  ];

  const stats = [
    { label: 'Pros listed', value: formatCount(total) },
    { label: 'Cities & towns', value: formatCount(cities.length) },
    { label: 'Service categories', value: formatCount(categories.length) },
    { label: 'Avg. Google rating', value: avgRating ? `${avgRating.toFixed(1)} ★` : 'n/a', detail: reviews ? `${formatCount(reviews)} reviews` : undefined },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: `${countyName} County` }]} />

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Home Service Pros in {countyName} County, Florida</h1>
        <p className="text-gray-700 max-w-3xl mb-6">
          HireAnyPro lists {plural(total, 'local business', 'local businesses')} in {countyName} County
          {topCats.length > 0 && <>, led by {listJoin(topCats.map((c) => `${lowerCategory(c.name)} (${formatCount(c.count)})`))}</>}.
          {topCities.length > 0 && <> Most are based in {listJoin(topCities.map((c) => c.name))}.</>}
          {avgRating && <> Rated listings average {avgRating.toFixed(1)} out of 5 across {formatCount(reviews)} Google reviews.</>}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
              {s.detail && <div className="text-xs text-gray-400 mt-1">{s.detail}</div>}
            </div>
          ))}
        </div>

        {topPros.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top-rated pros in {countyName} County</h2>
            <ol className="grid md:grid-cols-2 gap-3">
              {topPros.map((p, i) => (
                <li key={p.slug} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-5">{i + 1}.</span>
                  <div>
                    <Link href={`/listing/${p.slug}`} className="font-semibold text-blue-800 hover:underline">{p.name}</Link>
                    <div className="text-sm text-gray-600">
                      {Number(p.rating).toFixed(1)} ★ · {formatCount(Number(p.review_count))} reviews
                      {p.categories && <> · {p.categories.name}</>}
                      {p.city && <> · {p.city}</>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-gray-500 mt-2">Ranked by Google rating among listings with at least 20 reviews.</p>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Services in {countyName} County</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const linkCities = cat.cities.filter((c) => linkable(c.count)).slice(0, 5);
              return (
                <div key={cat.slug} className="bg-white border border-gray-200 rounded-xl p-5">
                  <Link href={`/category/${cat.slug}`} className="flex items-center gap-3 mb-2 group">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-semibold text-gray-900 group-hover:text-blue-800">{cat.name}</span>
                    <span className="text-sm text-gray-500 ml-auto">{formatCount(cat.count)}</span>
                  </Link>
                  {linkCities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {linkCities.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/services/${cat.slug}/${c.slug}`}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-blue-50 hover:text-blue-800"
                        >
                          {c.name} ({c.count})
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cities and towns in {countyName} County</h2>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => {
              const cat = bestCategoryFor(c.slug);
              const label = `${c.name} · ${plural(c.count, 'pro', 'pros')}`;
              return (
                <li key={c.slug}>
                  {cat ? (
                    <Link
                      href={`/services/${cat.slug}/${c.slug}`}
                      title={`${cat.name} in ${c.name}`}
                      className="inline-block px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-300 hover:text-blue-800"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-500">{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {faqs.length > 0 && (
          <section className="mb-6 max-w-3xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{countyName} County FAQ</h2>
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
      </div>
    </>
  );
}
