import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import OwnerClaimFinder from '@/components/OwnerClaimFinder';
import { getProsCategoryStory, prosFaqs } from '@/lib/for-pros';
import { formatCount, faqPageJsonLd } from '@/lib/directory-content';

export async function generateStaticParams() {
  return [];
}
export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const s = await getProsCategoryStory(category);
  if (!s) return { title: 'Not Found' };
  const title = `List Your ${s.name} Business Free in Florida | HireAnyPro for Pros`;
  const description = `${formatCount(s.total)} Florida ${s.lc} businesses are listed on HireAnyPro. Find yours, claim it free, fix your details and get quote requests from homeowners. Pro $9/mo, Featured $49.99/mo.`;
  const url = `https://hireanypro.com/for-pros/${s.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, siteName: 'HireAnyPro' } };
}

export default async function ForProsCategoryPage({ params }: Props) {
  const { category } = await params;
  const s = await getProsCategoryStory(category);
  if (!s || s.total === 0) notFound();
  const faqs = prosFaqs(s);
  const unclaimedShare = s.total ? Math.round(((s.total - s.claimed) / s.total) * 100) : 0;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs)) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'For Pros', href: '/for-pros' }, { label: s.name }]} />
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Get found by Florida homeowners: list your {s.lc} business free</h1>
      <p className="text-lg text-gray-600 mb-8">
        HireAnyPro already lists <b>{formatCount(s.total)}</b> {s.lc} businesses in {formatCount(s.cityCount)} Florida-area cities
        {s.totalReviews ? <>, with {formatCount(s.totalReviews)} Google reviews between them (average {s.avg.toFixed(1)}/5)</> : null}.
        {' '}{unclaimedShare}% of them are still unclaimed, so their details are whatever public information we found.
      </p>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Find your {s.lc} listing</h2>
        <p className="text-sm text-gray-600 mb-4">Type your business name (add &quot;, city&quot; to narrow it down). Claiming is free, no credit card.</p>
        <OwnerClaimFinder source={`for_pros_${s.slug}`} />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">How {s.lc} pros get customers here</h2>
      <ol className="grid sm:grid-cols-3 gap-4 mb-10">
        {[
          ['1. Claim your listing', 'Free. Verify with your business email, or in one click from our email to the address on your listing.'],
          ['2. Fix your details', 'Add your phone, hours, services, service area and a real description. Homeowners compare listings side by side.'],
          ['3. Get quote requests', 'Homeowners request quotes from your listing and city page. We email you each request; Pro shows the full contact details.'],
        ].map(([t, d]) => (
          <li key={t} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-semibold text-gray-900 mb-1">{t}</p>
            <p className="text-sm text-gray-600">{d}</p>
          </li>
        ))}
      </ol>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">Where {s.lc} pros are listed</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-10 text-sm">
        {s.topCities.map((c) => (
          <li key={c.slug} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex justify-between">
            {c.indexable ? <Link href={`/services/${s.slug}/${c.slug}`} className="text-blue-800 hover:underline">{c.name}</Link> : <span>{c.name}</span>}
            <span className="text-gray-500">{formatCount(c.count)}</span>
          </li>
        ))}
      </ul>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">Plans</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="font-bold text-gray-900">Free · $0</p>
          <p className="text-sm text-gray-600 mt-1">Your listing in search, city and category pages. Edit your details. Quote request alerts by email.</p>
          <Link href={`/claim?utm_source=for_pros&utm_medium=web&utm_campaign=${s.slug}`} className="inline-block mt-3 text-blue-800 font-semibold hover:underline">Claim free →</Link>
        </div>
        <div className="bg-white border-2 border-blue-800 rounded-xl p-5">
          <p className="font-bold text-gray-900">Pro · $9/month</p>
          <p className="text-sm text-gray-600 mt-1">Phone, email and website shown, ranked above free listings, Verified badge, full customer contact details on every request.</p>
          <Link href={`/pricing?plan=pro&utm_source=for_pros&utm_medium=web&utm_campaign=${s.slug}`} className="inline-block mt-3 text-blue-800 font-semibold hover:underline">See Pro →</Link>
        </div>
        <div className="bg-white border-2 border-orange-400 rounded-xl p-5">
          <p className="font-bold text-gray-900">Featured · $49.99/month</p>
          <p className="text-sm text-gray-600 mt-1">Everything in Pro, plus the top spot on your city and category pages, a highlighted card and the homepage.</p>
          <Link href={`/pricing?plan=featured&utm_source=for_pros&utm_medium=web&utm_campaign=${s.slug}`} className="inline-block mt-3 text-orange-600 font-semibold hover:underline">See Featured →</Link>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-10">Paid plans are month to month. Cancel anytime; your free listing stays free.</p>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions from {s.lc} pros</h2>
      <div className="space-y-4 mb-10">
        {faqs.map((f) => (
          <div key={f.q} className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-1">{f.q}</h3>
            <p className="text-sm text-gray-600">{f.a}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600">Looking for a {s.lc} pro instead? <Link href={`/category/${s.slug}`} className="text-blue-800 hover:underline">Compare {formatCount(s.total)} {s.lc} pros in Florida</Link>.</p>
    </div>
  );
}
