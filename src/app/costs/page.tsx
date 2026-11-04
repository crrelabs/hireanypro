import { jsonLdHtml } from '@/lib/json-ld';
import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { COST_GUIDES, costPath, costRange } from '@/lib/cost-guides';

export const revalidate = 86400;
const URL = 'https://hireanypro.com/costs';
const TITLE = 'Home Service Costs in Florida (2026 Price Guides)';
const DESCRIPTION = 'Typical 2026 Florida prices for 22 home services: plumbers, AC repair, roofing, electricians, pest control, movers and more. Estimates plus free quotes.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: 'HireAnyPro', type: 'website', images: [{ url: '/logo.png', alt: 'HireAnyPro' }] },
};

export default function CostsIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: TITLE,
    itemListElement: COST_GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: `${g.title} cost in Florida`, url: `https://hireanypro.com${costPath(g.slug)}` })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cost guides' }]} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">What home services cost in Florida (2026)</h1>
        <p className="text-gray-700 mb-8">Typical price ranges for the most common jobs in 22 trades, with what drives the price in Florida. Use them to plan, then compare written quotes from local pros.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">Service</th><th className="p-3">Common job</th><th className="p-3">Typical price</th></tr></thead>
            <tbody>
              {COST_GUIDES.map((g) => (
                <tr key={g.slug} className="border-t border-gray-100">
                  <td className="p-3 font-medium"><Link href={costPath(g.slug)} className="text-blue-800 hover:underline">{g.title}</Link></td>
                  <td className="p-3 text-gray-700">{g.headline.job}</td>
                  <td className="p-3 whitespace-nowrap">{costRange(g.headline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-6">Estimates for typical Florida homes, compiled from published 2025–2026 cost guides and contractor price lists. Not quotes.</p>
      </div>
    </>
  );
}
