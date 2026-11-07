import { jsonLdHtml } from '@/lib/json-ld';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import CityQuoteForm from '@/components/CityQuoteForm';
import StickyQuoteBar from '@/components/StickyQuoteBar';
import CostJobsTable from '@/components/CostJobsTable';
import { COSTS_UPDATED, costPath, costRange, type CostGuide } from '@/lib/cost-guides';
import { costCityPath, resolveCityCost, type CityCostFacts } from '@/lib/city-costs';
import { faqPageJsonLd, formatCount, lowerCategory } from '@/lib/directory-content';
import { prosLabel } from '@/lib/pros-label';
import { clampDescription, clampTitle } from '@/lib/meta';
import { hubHref } from '@/lib/city-hubs';

// ISR, same as other directory pages. Next 16 ignores revalidate without generateStaticParams.
// Returning [] keeps the build from rendering every hub × trade pair (each one reads listings).
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const BASE = 'https://hireanypro.com';
const article = (noun: string) => (/^[aeiou]/i.test(noun) && !/^u[^n]/i.test(noun) ? 'an' : 'a');

type Props = { params: Promise<{ trade: string; city: string }> };

function listedPros(count: number, categoryName: string): string {
  const lc = lowerCategory(categoryName);
  if (count === 1) {
    if (/companies$/i.test(lc)) return `1 ${lc.replace(/companies$/i, 'company')}`;
    if (/services$/i.test(lc)) return `1 ${lc.replace(/services$/i, 'service')}`;
    return `1 ${lc} pro`;
  }
  return `${formatCount(count)} ${prosLabel(lc)}`;
}

function ratingClause(facts: CityCostFacts): string {
  if (facts.avg == null || facts.rated <= 0) return '';
  return `, with an average Google rating of ${facts.avg.toFixed(1)} out of 5 across ${formatCount(facts.reviews)} reviews`;
}

function h1For(guide: CostGuide, city: string, state: string): string {
  return `${guide.title} Cost in ${city}, ${state} (2026)`;
}

/** Keep the document title ≤65. Drop "(2026)" before shortening the guide name so the city stays. */
function metaTitle(guide: CostGuide, city: string, state: string): string {
  const place = `${city}, ${state}`;
  const withYear = `${guide.title} Cost in ${place} (2026)`;
  if (withYear.length <= 65) return withYear;
  const noYear = `${guide.title} Cost in ${place}`;
  if (noYear.length <= 65) return noYear;
  const tail = ` Cost in ${place}`;
  const room = 65 - tail.length;
  if (room < 3) return clampTitle(noYear);
  let short = guide.title.slice(0, room).trimEnd();
  const space = short.lastIndexOf(' ');
  if (space >= 3) short = short.slice(0, space);
  short = short.replace(/[,:;–—-]+$/u, '').trim();
  const title = short ? `${short}${tail}` : '';
  return title.length > 0 && title.length <= 65 ? title : clampTitle(noYear);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trade, city } = await params;
  const resolved = await resolveCityCost(trade, city);
  if (resolved.status === 'not-found') return { title: 'Not Found' };
  if (resolved.status === 'redirect') permanentRedirect(resolved.href);
  const { guide, hub, facts } = resolved;
  const url = `${BASE}${costCityPath(guide.slug, hub.slug)}`;
  const title = metaTitle(guide, hub.name, hub.state);
  const place = `${hub.name}, ${hub.state}`;
  const question = `How much does ${article(guide.noun)} ${guide.noun} cost in ${place}? `;
  const tail = `${guide.headline.job}: ${costRange(guide.headline)}. ${formatCount(facts.count)} listed. Free quotes.`;
  const description = clampDescription(question.length + tail.length <= 160 ? question + tail : `${place} ${guide.noun} prices (2026): ${tail}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'HireAnyPro', type: 'article', images: [{ url: '/logo.png', alt: 'HireAnyPro' }] },
  };
}

export default async function CityCostPage({ params }: Props) {
  const { trade, city } = await params;
  const resolved = await resolveCityCost(trade, city);
  if (resolved.status === 'not-found') notFound();
  if (resolved.status === 'redirect') permanentRedirect(resolved.href);
  const { guide, hub, category, facts } = resolved;
  const place = `${hub.name}, ${hub.state}`;
  const h1 = h1For(guide, hub.name, hub.state);
  const url = `${BASE}${costCityPath(guide.slug, hub.slug)}`;
  const listed = listedPros(facts.count, category.name);
  const rating = ratingClause(facts);
  const lc = lowerCategory(category.name);
  const serviceHref = `/services/${category.slug}/${hub.slug}`;
  const faqs = [
    {
      q: `How much does ${article(guide.noun)} ${guide.noun} cost in ${hub.name}?`,
      a: `${guide.headline.job} typically costs ${costRange(guide.headline)} in Florida in 2026. That is a statewide planning estimate, not a measured ${hub.name} price. HireAnyPro lists ${listed} in ${hub.name}${rating}. The price for a specific job is the written quote.`,
    },
    ...guide.faq,
    {
      q: `How do I get free ${lc} quotes in ${hub.name}?`,
      a: `Use the quote form on this page. Describe the job once and HireAnyPro sends it to up to 3 local pros. You can also compare listings on the ${hub.name} ${lc} page and contact a business directly. Requesting a quote is free.`,
    },
  ];
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Costs', href: '/costs' },
    { label: `${guide.title} cost`, href: costPath(guide.slug) },
    { label: place },
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: h1,
      dateModified: COSTS_UPDATED,
      datePublished: COSTS_UPDATED,
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'HireAnyPro', url: BASE },
      publisher: { '@type': 'Organization', name: 'HireAnyPro', logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Costs', item: `${BASE}/costs` },
        { '@type': 'ListItem', position: 3, name: `${guide.title} cost`, item: `${BASE}${costPath(guide.slug)}` },
        { '@type': 'ListItem', position: 4, name: place, item: url },
      ],
    },
    faqPageJsonLd(faqs),
  ];
  const jobLead = guide.headline.job.charAt(0).toLowerCase() + guide.headline.job.slice(1);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <article className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{h1}</h1>
        <p className="text-sm text-gray-500 mb-6">Updated November 2026 · Florida planning estimates, plus HireAnyPro listings in {hub.name}</p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <p className="text-gray-800">
            <strong>Short answer:</strong> {jobLead} typically costs <strong>{costRange(guide.headline)}</strong> in Florida in 2026.
            {' '}HireAnyPro lists {listed} in {hub.name}{rating}. These ranges are planning estimates, not a quote for a {hub.name} job.
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{guide.title} prices (2026)</h2>
        <p className="text-sm text-gray-600 mb-4">Same Florida ranges as the <Link href={costPath(guide.slug)} className="text-blue-800 hover:underline">statewide {guide.title} cost guide</Link>. Not a separate {hub.name} price list.</p>
        <CostJobsTable jobs={guide.jobs} />

        <CityQuoteForm
          formName="city_cost_multi_quote"
          categorySlug={category.slug}
          categoryName={category.name}
          citySlug={hub.slug}
          cityName={hub.name}
        />
        <StickyQuoteBar targetId="get-quotes" form="city_cost_multi_quote" label={`Get up to 3 free ${guide.title.toLowerCase()} quotes in ${hub.name}`} />

        <h2 className="text-xl font-semibold text-gray-900 mb-3">{`In ${hub.name}`}</h2>
        <p className="text-gray-700 mb-8">
          Labor availability, permits, how hard the work is to reach, and the exact scope all move a job inside the Florida range above.
          HireAnyPro does not publish a {hub.name} markup or discount on top of those ranges.
          {' '}The directory lists {listed} in {hub.name}{rating}.
          Comparing written quotes is how you see the price for your job.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mb-3">What changes the price</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-gray-700 text-sm mb-8">
          {guide.drivers.map((d) => <li key={d}>{d}</li>)}
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mb-3">Compare pros and related pages</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-gray-700 text-sm mb-10">
          <li><Link href={costPath(guide.slug)} className="text-blue-800 hover:underline">Florida {guide.title} cost guide</Link></li>
          <li><Link href={serviceHref} className="text-blue-800 hover:underline">{category.name} in {hub.name}</Link> ({formatCount(facts.count)} listed)</li>
          <li><Link href={hubHref(hub.slug)} className="text-blue-800 hover:underline">All home services in {hub.name}</Link></li>
          <li><Link href={`/category/${category.slug}`} className="text-blue-800 hover:underline">All Florida {lc}</Link></li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently asked questions</h2>
        <div className="space-y-4 mb-10">
          {faqs.map((f) => (
            <div key={f.q}><h3 className="font-medium text-gray-900">{f.q}</h3><p className="text-gray-700 text-sm mt-1">{f.a}</p></div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-4">
          How we estimate: ranges are typical installed prices for Florida homes in 2026. On 2026-11-05 we checked each guide’s headline job against at least two public sources (Angi, HomeGuide, Fixr, EnergySage, and Florida contractor guides where available) and logged sources in our cost-sources file; secondary jobs use those guides or a related planning estimate. South Florida and resort areas tend to sit at the high end, North Florida and the Panhandle at the low end. Prices are not quotes and change with materials, season and storms. Listing counts and ratings are HireAnyPro directory facts for {hub.name}, not a price survey. See Sources below.
        </p>
        {guide.sources && guide.sources.length > 0 && (
          <section className="mb-6" aria-labelledby="cost-sources-heading">
            <h2 id="cost-sources-heading" className="text-sm font-semibold text-gray-900 mb-2">Sources</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-800 hover:underline">{s.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
