import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import report from '@/data/florida-ratings-2026.json';
import { countySlug } from '@/lib/geo';

// A dated snapshot (not live counts) so the numbers people cite stay stable. Regenerate with
// scripts/build-florida-ratings-report.py and update asOf when refreshing.
const URL = 'https://hireanypro.com/data/florida-contractor-ratings-2026';
const asOf = new Date(report.asOf + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
const o = report.overall;

export const metadata: Metadata = {
  title: 'Florida Contractor Ratings by City and Category (2026 Data)',
  description: `How Florida home service pros are rated: ${fmt(o.listings)} businesses, ${fmt(o.totalReviews)} Google reviews, average ${o.avgRating} stars. Ratings and counts by category, city and county, with methodology.`,
  alternates: { canonical: URL },
  openGraph: { title: 'Florida Contractor Ratings by City and Category (2026)', url: URL, type: 'article' },
};

export default function FloridaRatingsReport() {
  const cats = report.categories;
  const byRating = [...cats].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  const best = byRating[0];
  const worst = byRating[byRating.length - 1];
  const mostReviewed = [...cats].sort((a, b) => (b.medianReviews ?? 0) - (a.medianReviews ?? 0))[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Florida home service contractor ratings and counts by city and category, 2026',
    description: `Counts, average Google ratings and review counts for ${o.listings} Florida home service businesses listed on HireAnyPro, by category, city and county.`,
    url: URL,
    dateModified: report.asOf,
    temporalCoverage: '2026',
    spatialCoverage: { '@type': 'Place', name: 'Florida, United States' },
    creator: { '@type': 'Organization', name: 'HireAnyPro', url: 'https://hireanypro.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
  };
  const th = 'text-left font-semibold text-gray-900 px-3 py-2 border-b border-gray-200';
  const td = 'px-3 py-2 border-b border-gray-100';
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 text-gray-700 leading-relaxed">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Data' }, { label: 'Florida contractor ratings 2026' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Florida Contractor Ratings by City and Category (2026)</h1>
      <p className="text-sm text-gray-500 mb-6">Data as of {asOf} · {fmt(o.listings)} Florida businesses · 22 service categories · {fmt(report.countyCount)} counties</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">Key findings</h2>
      <ul className="list-disc pl-6 space-y-1 mb-6">
        <li>We looked at <strong>{fmt(o.listings)}</strong> Florida home service businesses. <strong>{fmt(o.rated)}</strong> of them have public Google ratings, adding up to <strong>{fmt(o.totalReviews)}</strong> reviews.</li>
        <li>The average rating is <strong>{o.avgRating} stars</strong> (median {o.medianRating}). <strong>{o.pct45}%</strong> of rated businesses score 4.5 or higher, and only <strong>{o.pctUnder4}%</strong> fall below 4.0.</li>
        <li>Because almost everyone is rated highly, the star rating alone says little. The number of reviews matters: the typical (median) rated business has <strong>{o.medianReviews}</strong> reviews.</li>
        <li>Highest-rated category: <strong>{best.name}</strong> ({best.avgRating} average). Lowest: <strong>{worst.name}</strong> ({worst.avgRating} average, {worst.pct45}% at 4.5+).</li>
        <li><strong>{mostReviewed.name}</strong> businesses collect the most reviews (median {mostReviewed.medianReviews} per business).</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">How ratings are spread</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>Google rating</th><th className={th}>Businesses</th><th className={th}>Share of rated</th></tr></thead>
          <tbody>
            {report.distribution.map((d) => (
              <tr key={d.band}><td className={td}>{d.band}</td><td className={td}>{fmt(d.count)}</td><td className={td}>{((100 * d.count) / o.rated).toFixed(1)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Ratings by service category</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>Category</th><th className={th}>Businesses</th><th className={th}>Avg rating</th><th className={th}>Rated 4.5+</th><th className={th}>Median reviews</th><th className={th}>City with most</th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.slug}>
                <td className={td}><Link href={`/category/${c.slug}`} className="text-blue-800 hover:underline">{c.name}</Link></td>
                <td className={td}>{fmt(c.listings)}</td><td className={td}>{c.avgRating}</td><td className={td}>{c.pct45}%</td><td className={td}>{fmt(c.medianReviews)}</td><td className={td}>{c.topCity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Ratings in the 30 cities with the most listings</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>City</th><th className={th}>Businesses</th><th className={th}>Avg rating</th><th className={th}>Rated 4.5+</th><th className={th}>Median reviews</th><th className={th}>Most common service</th></tr></thead>
          <tbody>
            {report.cities.map((c) => (
              <tr key={c.city}><td className={td}>{c.city}</td><td className={td}>{fmt(c.listings)}</td><td className={td}>{c.avgRating}</td><td className={td}>{c.pct45}%</td><td className={td}>{fmt(c.medianReviews)}</td><td className={td}>{c.topCategory}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Ratings by county</h2>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full text-sm bg-white border border-gray-200 rounded-lg">
          <thead><tr><th className={th}>County</th><th className={th}>Businesses</th><th className={th}>Avg rating</th><th className={th}>Rated 4.5+</th><th className={th}>Median reviews</th></tr></thead>
          <tbody>
            {report.counties.map((c) => (
              <tr key={c.county}>
                <td className={td}><Link href={`/region/${countySlug(c.county)}`} className="text-blue-800 hover:underline">{c.county}</Link></td>
                <td className={td}>{fmt(c.listings)}</td><td className={td}>{c.avgRating ?? '—'}</td><td className={td}>{c.pct45 == null ? '—' : `${c.pct45}%`}</td><td className={td}>{fmt(c.medianReviews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Methodology</h2>
      <ul className="list-disc pl-6 space-y-1 mb-6">
        <li>Source: every Florida business listed in the HireAnyPro directory database on {asOf} ({fmt(o.listings)} businesses in 22 home service categories). Listings in Georgia and Alabama are excluded.</li>
        <li>Ratings and review counts are each business&apos;s public Google rating and review count as stored in our listings. A business counts as &ldquo;rated&rdquo; when it has a rating and at least one review ({fmt(o.rated)} businesses).</li>
        <li>Average rating is the simple mean of business ratings (not weighted by review count). &ldquo;Median reviews&rdquo; is the middle review count among rated businesses.</li>
        <li>Cities use the city in each business&apos;s address; counties use the county we assign from that address. The directory is cleaned weekly (duplicates, closed and out-of-state businesses removed), so live counts on the site can differ slightly from this snapshot.</li>
        <li>This is a directory snapshot, not a survey of every contractor in Florida, and ratings are not a quality guarantee. Always check licensing with the <a href="https://www.myfloridalicense.com/" rel="noopener" className="text-blue-800 hover:underline">Florida DBPR</a> before hiring.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Using this data</h2>
      <p className="mb-4">Journalists, bloggers and local organizations are welcome to quote or chart these numbers. Please credit &ldquo;HireAnyPro&rdquo; with a link to this page. Need a cut we don&apos;t show here (a specific city, county or service)? Email <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a>.</p>
      <p className="text-sm text-gray-500">Looking for a pro? <Link href="/categories" className="text-blue-800 hover:underline">Browse all categories</Link> or <Link href="/search" className="text-blue-800 hover:underline">search by city</Link>.</p>
    </div>
  );
}
