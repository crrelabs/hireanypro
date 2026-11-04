import { jsonLdHtml } from '@/lib/json-ld';
import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { DBPR_URL, FDACS_URL, FMCSA_URL, GUIDE_PATH, LICENSE_RULES } from '@/lib/fl-licensing';
import { faqPageJsonLd } from '@/lib/directory-content';

export const revalidate = 86400;

const URL = `https://hireanypro.com${GUIDE_PATH}`;
const TITLE = 'How to Check a Contractor License in Florida (2026 Guide)';
const DESCRIPTION = 'Check a Florida contractor license in 2 minutes: which trades need a state license, how to look it up (DBPR, FDACS) and the rules that protect homeowners.';
const UPDATED = '2026-11-02';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: 'HireAnyPro', type: 'article', images: [{ url: '/logo.png', alt: 'HireAnyPro' }] },
};

const steps: { h: string; p: string }[] = [
  { h: 'Get the exact business name and license number', p: 'Licensed Florida contractors must put their license number on contracts, bids and ads. If a contractor will not give you one, treat that as a no.' },
  { h: 'Look it up with the state', p: 'For construction trades and electricians, search the Florida Department of Business and Professional Regulation (DBPR) at myfloridalicense.com by name or license number. Pest control companies and movers are checked with the Florida Department of Agriculture and Consumer Services (FDACS) instead.' },
  { h: 'Check that the license is current and matches the job', p: 'The status should read current and active, the name should match the company on your contract, and the license type should cover the work (a roofing license does not cover electrical work).' },
  { h: 'Ask for proof of insurance', p: 'Ask for a certificate of general liability insurance and workers\u2019 compensation coverage (or the state exemption) and confirm it with the insurer before work starts.' },
  { h: 'Make sure permits are pulled by the contractor', p: 'Most structural, roofing, electrical, plumbing and HVAC jobs need a permit. The licensed contractor should pull it in their own name. If you are asked to pull an owner-builder permit for work a contractor is doing, you take on the legal responsibility.' },
  { h: 'Compare at least 3 written quotes', p: 'Get written, itemized quotes from at least three licensed pros, and compare public reviews. A rating of 4.5 or higher backed by many reviews is a good sign; a brand-new business with no reviews is not necessarily bad but deserves more checking.' },
];

const rules: { h: string; p: string }[] = [
  { h: 'Deposits over 10%', p: 'Under section 489.126, Florida Statutes, a contractor who takes more than 10% of the contract price up front on a residential job must apply for permits within 30 days and start work within 90 days after the permits are issued, unless you agree in writing to a longer period.' },
  { h: 'Notice of Commencement', p: 'For most improvements over $2,500, a Notice of Commencement must be recorded with the county before the first inspection (Chapter 713, Florida Statutes). Your contractor or permit office can tell you if your job needs one.' },
  { h: 'Lien releases before final payment', p: 'Under Florida\u2019s construction lien law, unpaid subcontractors and suppliers can place a lien on your home even if you paid the contractor. Ask for lien releases from them before you make the final payment.' },
  { h: 'Unlicensed contracting is a crime', p: 'Contracting without a required license is a crime under section 489.127, Florida Statutes, with tougher penalties during a declared state of emergency, such as after a hurricane. Report it to DBPR.' },
  { h: 'The Homeowners\u2019 Construction Recovery Fund', p: 'Florida\u2019s recovery fund can reimburse homeowners for certain losses caused by a state-licensed contractor. It does not cover work by unlicensed contractors, which is one more reason to check first.' },
  { h: 'After a storm', p: 'Be careful with door-to-door crews after hurricanes. Check the license, never pay in full up front, and do not sign over your insurance benefits without reading the contract.' },
];

const faqs = [
  { q: 'How do I check if a contractor is licensed in Florida?', a: 'Search the contractor\u2019s name or license number on the DBPR site, myfloridalicense.com. Confirm the license is current and active and that the license type matches the job. Pest control companies and movers are licensed by FDACS instead.' },
  { q: 'How do I find a licensed contractor in Miami?', a: 'Start with a directory of local pros such as HireAnyPro (hireanypro.com/services/general-contractor/miami), shortlist three with strong ratings and many reviews, then verify each one\u2019s license on myfloridalicense.com and ask for proof of insurance before signing.' },
  { q: 'What is the difference between a certified and a registered contractor in Florida?', a: 'A certified contractor holds a state license that is valid anywhere in Florida. A registered contractor holds a state registration based on a local license and may only work where that local license is valid.' },
  { q: 'Does a handyman need a license in Florida?', a: 'Florida has no statewide handyman license, but a handyman may not do work that requires a licensed contractor, such as structural, roofing, electrical, plumbing or HVAC work. Some counties license handymen locally.' },
  { q: 'How much deposit can a contractor ask for in Florida?', a: 'There is no fixed cap, but if a contractor takes more than 10% of the price up front on a residential job, Florida law requires them to apply for permits within 30 days and start work within 90 days after the permits are issued, unless you agree otherwise in writing.' },
  { q: 'Who licenses pest control companies in Florida?', a: 'The Florida Department of Agriculture and Consumer Services (FDACS) licenses pest control businesses under Chapter 482, Florida Statutes.' },
];

export default function LicenseGuidePage() {
  const stateTrades = LICENSE_RULES.filter((r) => r.level === 'state');
  const localTrades = LICENSE_RULES.filter((r) => r.level === 'local');
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: TITLE,
      description: DESCRIPTION,
      dateModified: UPDATED,
      datePublished: UPDATED,
      mainEntityOfPage: URL,
      author: { '@type': 'Organization', name: 'HireAnyPro', url: 'https://hireanypro.com' },
      publisher: { '@type': 'Organization', name: 'HireAnyPro', logo: { '@type': 'ImageObject', url: 'https://hireanypro.com/logo.png' } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hireanypro.com' },
        { '@type': 'ListItem', position: 2, name: 'Check a Florida contractor license' },
      ],
    },
    faqPageJsonLd(faqs),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <article className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Check a Florida contractor license' }]} />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">How to check a contractor license in Florida</h1>
        <p className="text-sm text-gray-500 mb-6">Updated November 2026 · HireAnyPro guide for Florida homeowners</p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <p className="text-gray-800">
            <strong>Short answer:</strong> search the contractor&apos;s name or license number at{' '}
            <a href={DBPR_URL} className="text-blue-800 underline" rel="noopener" target="_blank">myfloridalicense.com</a>{' '}
            (Florida DBPR). The license should be current and active, match the company on your contract, and cover the type of work.
            Pest control companies and movers are checked with <a href={FDACS_URL} className="text-blue-800 underline" rel="noopener" target="_blank">FDACS</a> instead.
            Painters, cleaners, landscapers and handymen have no statewide license, so check your county and ask for insurance.
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6 steps before you hire</h2>
        <ol className="space-y-4 mb-10">
          {steps.map((s, i) => (
            <li key={s.h} className="flex gap-4">
              <span className="flex-none w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center font-semibold">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{s.h}</h3>
                <p className="text-gray-700 text-sm mt-1">{s.p}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 id="by-trade" className="text-2xl font-semibold text-gray-900 mb-2">Which Florida trades need a state license?</h2>
        <p className="text-gray-700 mb-4">These trades need a Florida license for most jobs:</p>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 text-left">
              <tr><th className="p-3">Trade</th><th className="p-3">Licensed by</th><th className="p-3">What to know</th></tr>
            </thead>
            <tbody>
              {stateTrades.map((r) => (
                <tr key={r.slug} id={`license-${r.slug}`} className="border-t border-gray-100 align-top">
                  <td className="p-3 font-medium"><Link href={`/category/${r.slug}`} className="text-blue-800 hover:underline">{r.trade}</Link></td>
                  <td className="p-3 text-gray-700">{r.issuer}</td>
                  <td className="p-3 text-gray-700">{r.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 mb-4">These trades have no statewide license, but local rules still apply:</p>
        <ul className="space-y-3 mb-10">
          {localTrades.map((r) => (
            <li key={r.slug} id={`license-${r.slug}`} className="text-sm text-gray-700">
              <Link href={`/category/${r.slug}`} className="font-medium text-blue-800 hover:underline">{r.trade}</Link>: {r.rule}
            </li>
          ))}
        </ul>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Florida rules that protect homeowners</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {rules.map((r) => (
            <div key={r.h} className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-1">{r.h}</h3>
              <p className="text-sm text-gray-700">{r.p}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently asked questions</h2>
        <div className="space-y-4 mb-10">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-medium text-gray-900">{f.q}</h3>
              <p className="text-gray-700 text-sm mt-1">{f.a}</p>
            </div>
          ))}
        </div>

        <section className="p-6 bg-blue-50 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Find pros to check</h2>
          <p className="text-gray-700 text-sm mb-3">Compare rated local pros, then verify the license of your top three:</p>
          <div className="flex flex-wrap gap-2">
            {[['general-contractor', 'General contractors'], ['roofing', 'Roofers'], ['plumbing', 'Plumbers'], ['electrical', 'Electricians'], ['hvac', 'HVAC'], ['pest-control', 'Pest control']].map(([slug, label]) => (
              <Link key={slug} href={`/services/${slug}/miami`} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:text-blue-800">{label} in Miami</Link>
            ))}
            <Link href="/cities/miami" className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:text-blue-800">All services in Miami</Link>
            <Link href="/categories" className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:text-blue-800">All categories</Link>
            <Link href="/costs" className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:text-blue-800">What jobs cost in Florida</Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            This guide is general information, not legal advice. Rules change; the state agencies (DBPR, FDACS and, for interstate movers,{' '}
            <a href={FMCSA_URL} className="underline" rel="noopener" target="_blank">FMCSA</a>) are the final word.
          </p>
        </section>
      </article>
    </>
  );
}
