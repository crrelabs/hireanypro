import { jsonLdHtml } from '@/lib/json-ld';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import QuoteFinder from '@/components/QuoteFinder';
import report from '@/data/florida-ratings-2026-by-category.json';
import { COST_GUIDES, COSTS_UPDATED, costGuide, costPath, costRange } from '@/lib/cost-guides';
import { faqPageJsonLd, lowerCategory } from '@/lib/directory-content';
import { prosLabel } from '@/lib/pros-label';
import { clampDescription } from '@/lib/meta';
import { GUIDE_PATH } from '@/lib/fl-licensing';

export const dynamicParams = false;
export const revalidate = 86400;
export function generateStaticParams() {
  return COST_GUIDES.map((g) => ({ trade: g.slug }));
}

const BASE = 'https://hireanypro.com';
const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
const article = (noun: string) => (/^[aeiou]/i.test(noun) && !/^u[^n]/i.test(noun) ? 'an' : 'a');
const titleFor = (t: string) => `${t} Cost in Florida (2026): Typical Prices`;

export async function generateMetadata({ params }: { params: Promise<{ trade: string }> }): Promise<Metadata> {
  const g = costGuide((await params).trade);
  if (!g) return {};
  const url = `${BASE}${costPath(g.slug)}`;
  const title = titleFor(g.title);
  const description = clampDescription(`How much does ${article(g.noun)} ${g.noun} cost in Florida? ${g.headline.job}: ${costRange(g.headline)}. Prices for ${g.jobs.length} common jobs, what drives cost, and free quotes.`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'HireAnyPro', type: 'article', images: [{ url: '/logo.png', alt: 'HireAnyPro' }] },
  };
}

export default async function CostGuidePage({ params }: { params: Promise<{ trade: string }> }) {
  const g = costGuide((await params).trade);
  if (!g) notFound();
  const cat = report.categories.find((c) => c.slug === g.slug);
  const lc = lowerCategory(cat?.name || g.title);
  const url = `${BASE}${costPath(g.slug)}`;
  const title = titleFor(g.title);
  const cities = (cat?.cities || []).filter((c) => c.href).slice(0, 10);
  const faqs = [
    { q: `How much does ${article(g.noun)} ${g.noun} cost in Florida?`, a: `It depends on the job. ${g.headline.job} typically costs ${costRange(g.headline)} in Florida in 2026. ${g.jobs.filter((j) => j.job !== g.headline.job).slice(0, 2).map((j) => `${j.job}: ${costRange(j)}.`).join(' ')}` },
    ...g.faq,
    { q: 'Why do quotes vary so much?', a: `The biggest factors are ${g.drivers.slice(0, 3).map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join('; ')}. Getting 3 written quotes for the same scope is the best way to see the real local price.` },
    { q: `How do I get a free quote from ${prosLabel(lc)} near me?`, a: `Use the HireAnyPro quote form on this page or on your city page: pick your city and describe the job, and up to 3 local ${prosLabel(lc)} can reply. It is free and there is no obligation.` },
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
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
        { '@type': 'ListItem', position: 2, name: 'Florida cost guides', item: `${BASE}/costs` },
        { '@type': 'ListItem', position: 3, name: `${g.title} cost` },
      ],
    },
    faqPageJsonLd(faqs),
  ];
  const td = 'p-3 align-top';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <article className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cost guides', href: '/costs' }, { label: `${g.title} cost` }]} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">How much does {article(g.noun)} {g.noun} cost in Florida?</h1>
        <p className="text-sm text-gray-500 mb-6">Updated November 2026 · HireAnyPro cost guide for Florida homeowners</p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <p className="text-gray-800">
            <strong>Short answer:</strong> {g.headline.job.charAt(0).toLowerCase() + g.headline.job.slice(1)} typically costs <strong>{costRange(g.headline)}</strong> in Florida in 2026.
            {' '}Prices for {g.jobs.length} common jobs are below. These are planning estimates, not quotes: the only way to know your price is to compare written quotes from local pros.
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{g.title} prices in Florida (2026)</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">Job</th><th className="p-3">Typical price</th></tr></thead>
            <tbody>
              {g.jobs.map((j) => (
                <tr key={j.job} className="border-t border-gray-100">
                  <td className={td}>{j.job}{j.note && <span className="block text-xs text-gray-500 mt-0.5">{j.note}</span>}</td>
                  <td className={`${td} font-medium whitespace-nowrap`}>{costRange(j)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <QuoteFinder source="cost_guide" initialCategory={g.slug} className="mb-10"
          categories={[{ slug: g.slug, name: cat?.name || g.title }]}
          title={`Get up to 3 free quotes from ${prosLabel(lc)} near you`} />

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What changes the price</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700 text-sm">{g.drivers.map((d) => <li key={d}>{d}</li>)}</ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Before you hire</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-700 text-sm">{g.tips.map((d) => <li key={d}>{d}</li>)}</ul>
          </section>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-3">What is different in Florida</h2>
        <p className="text-gray-700 mb-8">{g.florida} See also: <Link href={GUIDE_PATH} className="text-blue-800 hover:underline">how to check a contractor license in Florida</Link>.</p>

        {cat && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Compare {prosLabel(lc)} in your city</h2>
            <p className="text-gray-700 text-sm mb-3">
              HireAnyPro lists {fmt(cat.listings)} Florida {lc} businesses, average Google rating {cat.avgRating} across {fmt(cat.totalReviews)} reviews
              (<Link href={`/data/florida-contractor-ratings-2026/${cat.slug}`} className="text-blue-800 hover:underline">full ratings data</Link>).
            </p>
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <Link key={c.href} href={c.href!} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:text-blue-800">{cat.name} in {c.city} ({fmt(c.listings)})</Link>
              ))}
              <Link href={`/category/${cat.slug}`} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:text-blue-800">All Florida cities</Link>
            </div>
          </section>
        )}

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently asked questions</h2>
        <div className="space-y-4 mb-10">
          {faqs.map((f) => (
            <div key={f.q}><h3 className="font-medium text-gray-900">{f.q}</h3><p className="text-gray-700 text-sm mt-1">{f.a}</p></div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-6">
          How we estimate: ranges are typical installed prices for Florida homes in 2026, compiled from published 2025–2026 Florida and national cost guides and contractor price lists.
          South Florida and resort areas tend to sit at the high end, North Florida and the Panhandle at the low end. Prices are not quotes and change with materials, season and storms.
        </p>
        <p className="text-sm text-gray-500">Other cost guides: {COST_GUIDES.filter((x) => x.slug !== g.slug).map((x, i) => (<span key={x.slug}>{i ? ' · ' : ''}<Link href={costPath(x.slug)} className="text-blue-800 hover:underline">{x.title}</Link></span>))}</p>
      </article>
    </>
  );
}
