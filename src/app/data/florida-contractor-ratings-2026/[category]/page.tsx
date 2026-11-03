import { jsonLdHtml } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { prosLabel } from '@/lib/pros-label';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import report from '@/data/florida-ratings-2026-by-category.json';
import overall from '@/data/florida-ratings-2026.json';
import { countySlug } from '@/lib/geo';
import { lowerCategory } from '@/lib/directory-content';
import { clampDescription } from '@/lib/meta';

// Per-trade cut of the dated Florida ratings snapshot (regenerate with scripts/build-category-ratings-report.py).
// Aggregates only: no per-business "best of" lists, so miscategorized rows can't end up named on a citable page.
const BASE = 'https://hireanypro.com/data/florida-contractor-ratings-2026';
type Cat = (typeof report.categories)[number];
const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
const one = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(2).replace(/0$/, ''));
const asOf = new Date(report.asOf + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const dynamicParams = false;
export function generateStaticParams() {
  return report.categories.map((c) => ({ category: c.slug }));
}

function find(slug: string): Cat | undefined {
  return report.categories.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const c = find((await params).category);
  if (!c) return {};
  const url = `${BASE}/${c.slug}`;
  const title = `Florida ${c.name} Ratings and Reviews by City (2026 Data)`;
  return {
    title,
    description: clampDescription(`${fmt(c.listings)} Florida ${lowerCategory(c.name)} businesses: average Google rating ${one(c.avgRating)}, ${c.pct45}% rated 4.5+, median ${fmt(c.medianReviews)} reviews. Breakdown by city and county.`),
    alternates: { canonical: url },
    openGraph: { title, url, type: 'article', images: [{ url: '/logo.png', alt: 'HireAnyPro' }] },
  };
}

export default async function CategoryRatings({ params }: { params: Promise<{ category: string }> }) {
  const c = find((await params).category);
  if (!c) notFound();
  const lc = lowerCategory(c.name);
  const all = report.categories;
  const rankRating = [...all].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).findIndex((x) => x.slug === c.slug) + 1;
  const rankSize = all.findIndex((x) => x.slug === c.slug) + 1;
  const stateAvg = overall.overall.avgRating;
  const top = c.cities[0];
  const ratedCities = c.cities.filter((x) => x.rated >= 10 && x.avgRating != null);
  const bestCity = [...ratedCities].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))[0];
  const busiest = [...ratedCities].sort((a, b) => (b.medianReviews ?? 0) - (a.medianReviews ?? 0))[0];
  const url = `${BASE}/${c.slug}`;
  const faqs = [
    { q: `How many ${lc} businesses are in Florida?`, a: `HireAnyPro lists ${fmt(c.listings)} ${lc} businesses in ${fmt(c.cityCount)} Florida cities (data as of ${asOf}). ${top ? `${top.city} has the most, with ${fmt(top.listings)}.` : ''}` },
    { q: `What is the average Google rating for Florida ${lc} companies?`, a: `${one(c.avgRating)} stars across ${fmt(c.rated)} rated businesses (median ${c.medianRating}). ${c.pct45}% are rated 4.5 or higher and ${c.pctUnder4}% are below 4.0. The statewide average across all 22 home service categories is ${stateAvg}.` },
    { q: `How many reviews does a typical Florida ${lc} business have?`, a: `The median rated ${lc} business has ${fmt(c.medianReviews)} Google reviews. Because most businesses are rated 4.5+, the number of reviews tells you more than the star rating alone.` },
    { q: `How should I choose a ${lc.replace(/ (companies|services)$/i, "")} pro in Florida?`, a: `Compare several local pros: look for a 4.5+ rating backed by many reviews, check the license with the Florida DBPR (myfloridalicense.com), and get at least 3 written quotes. HireAnyPro lets you request free quotes from up to 3 ${prosLabel(lc)} at once.` },
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Dataset',
      name: `Florida ${lc} business ratings and counts by city and county, 2026`,
      description: `Counts, average Google ratings and review counts for ${c.listings} Florida ${lc} businesses listed on HireAnyPro, by city and county.`,
      url, dateModified: report.asOf, temporalCoverage: '2026',
      spatialCoverage: { '@type': 'Place', name: 'Florida, United States' },
      creator: { '@type': 'Organization', name: 'HireAnyPro', url: 'https://hireanypro.com' },
      isPartOf: { '@type': 'Dataset', url: BASE },
      license: 'https://creativecommons.org/licenses/by/4.0/', isAccessibleForFree: true,
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
  const th = 'text-left font-semibold text-gray-900 px-3 py-2 border-b border-gray-200';
  const td = 'px-3 py-2 border-b border-gray-100';
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 text-gray-700 leading-relaxed">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Florida contractor ratings 2026', href: '/data/florida-contractor-ratings-2026' }, { label: c.name }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Florida {c.name} Ratings by City (2026)</h1>
      <p className="text-sm text-gray-500 mb-6">Data as of {asOf} · {fmt(c.listings)} Florida {lc} businesses · {fmt(c.totalReviews)} Google reviews · {fmt(c.cityCount)} cities</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">Key findings</h2>
      <ul className="list-disc pl-6 space-y-1 mb-6">
        <li>Florida has <strong>{fmt(c.listings)}</strong> {lc} businesses in our directory, the #{rankSize} largest of 22 home service categories. <strong>{fmt(c.rated)}</strong> have public Google ratings.</li>
        <li>The average rating is <strong>{one(c.avgRating)} stars</strong> (median {c.medianRating}), #{rankRating} of 22 categories (statewide average across all categories: {stateAvg}). <strong>{c.pct45}%</strong> score 4.5 or higher; <strong>{c.pctUnder4}%</strong> are below 4.0.</li>
        <li>The typical rated {lc} business has <strong>{fmt(c.medianReviews)}</strong> reviews.</li>
        {top && <li><strong>{top.city}</strong> has the most {lc} businesses ({fmt(top.listings)}).</li>}
        {bestCity && <li>Among the 15 biggest {lc} cities with at least 10 rated businesses, <strong>{bestCity.city}</strong> has the highest average rating ({one(bestCity.avgRating)}){busiest && busiest.city !== bestCity.city ? <> and <strong>{busiest.city}</strong> businesses have the most reviews (median {fmt(busiest.medianReviews)})</> : null}.</li>}
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">How {lc} ratings are spread</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>Google rating</th><th className={th}>Businesses</th><th className={th}>Share of rated</th></tr></thead>
          <tbody>
            {c.distribution.map((d) => (
              <tr key={d.band}><td className={td}>{d.band}</td><td className={td}>{fmt(d.count)}</td><td className={td}>{c.rated ? ((100 * d.count) / c.rated).toFixed(1) : '0.0'}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">{c.name} in the {c.cities.length} Florida cities with the most listings</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>City</th><th className={th}>Businesses</th><th className={th}>Avg rating</th><th className={th}>Rated 4.5+</th><th className={th}>Median reviews</th></tr></thead>
          <tbody>
            {c.cities.map((x) => (
              <tr key={x.city}>
                <td className={td}>{x.href ? <Link href={x.href} className="text-blue-800 hover:underline">{x.city}</Link> : x.city}</td>
                <td className={td}>{fmt(x.listings)}</td><td className={td}>{one(x.avgRating)}</td><td className={td}>{x.pct45 == null ? '—' : `${x.pct45}%`}</td><td className={td}>{fmt(x.medianReviews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">{c.name} by county (top {c.counties.length} of {c.countyCount})</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>County</th><th className={th}>Businesses</th><th className={th}>Avg rating</th><th className={th}>Rated 4.5+</th><th className={th}>Median reviews</th></tr></thead>
          <tbody>
            {c.counties.map((x) => (
              <tr key={x.county}>
                <td className={td}><Link href={`/region/${countySlug(x.county)}`} className="text-blue-800 hover:underline">{x.county}</Link></td>
                <td className={td}>{fmt(x.listings)}</td><td className={td}>{one(x.avgRating)}</td><td className={td}>{x.pct45 == null ? '—' : `${x.pct45}%`}</td><td className={td}>{fmt(x.medianReviews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Common questions</h2>
      <div className="space-y-3 mb-6">
        {faqs.map((f) => (
          <div key={f.q}><h3 className="font-semibold text-gray-900">{f.q}</h3><p>{f.a}</p></div>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Methodology</h2>
      <p className="mb-4">Same source and rules as the <Link href="/data/florida-contractor-ratings-2026" className="text-blue-800 hover:underline">Florida contractor ratings report</Link>: every Florida business in the HireAnyPro {lc} category on {asOf}, with each business&apos;s public Google rating and review count. A business counts as rated when it has a rating and at least one review. Averages are simple means (not weighted by reviews). This is a directory snapshot, not a survey of every {lc} business in Florida, and ratings are not a quality guarantee.</p>
      <p className="mb-4">Journalists and bloggers are welcome to quote these numbers with a link to this page. Need another cut? Email <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a>.</p>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link href={`/category/${c.slug}`} className="bg-blue-800 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700">Find {prosLabel(lc)} near you</Link>
        <Link href={`/for-pros/${c.slug}`} className="border border-blue-800 text-blue-800 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50">Own a {lc} business? List it free</Link>
      </div>
      <p className="text-sm text-gray-500 mt-6">Other trades: {all.filter((x) => x.slug !== c.slug).map((x, i) => (<span key={x.slug}>{i ? ' · ' : ''}<Link href={`/data/florida-contractor-ratings-2026/${x.slug}`} className="text-blue-800 hover:underline">{x.name}</Link></span>))}</p>
    </div>
  );
}
