import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import OwnerClaimFinder from '@/components/OwnerClaimFinder';
import { supabase } from '@/lib/supabase';
import { formatCount, faqPageJsonLd } from '@/lib/directory-content';
import { jsonLdHtml } from '@/lib/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'List Your Florida Home Service Business Free | HireAnyPro',
  description: 'Find your business on HireAnyPro, claim it free and get quote requests from Florida homeowners. For plumbers, electricians, roofers, HVAC pros and more.',
  alternates: { canonical: 'https://hireanypro.com/for-pros' },
};

/** Index FAQ for /for-pros (category pages already ship prosFaqs). No free trial / money-back. */
const FOR_PROS_FAQS = [
  {
    q: 'Is it free to list my business on HireAnyPro?',
    a: 'Yes. Claiming and editing your listing is free forever with no credit card. You only pay if you choose Pro ($9/mo) or Featured ($49.99/mo).',
  },
  {
    q: 'How do I find and claim my listing?',
    a: 'Use the search box on this page (add ", city" to narrow it). Pick your business, enter your business email, and click the verification link we send. Some emailed links let you claim in one click.',
  },
  {
    q: 'What does Pro add vs free?',
    a: 'Pro shows your phone, email and website on the listing, ranks you above free listings, adds a Verified badge, and sends every quote request with the customer’s full contact details. Cancel anytime.',
  },
  {
    q: 'What does Featured add?',
    a: 'Featured includes everything in Pro, plus the top spot on your city and category pages, a highlighted card and a homepage feature. Month to month, cancel anytime.',
  },
];

export default async function ForProsPage() {
  const { data: categories, error } = await supabase.from('categories').select('id, name, slug').order('name');
  if (error) throw new Error(`for-pros categories: ${error.message}`);
  const counts = await Promise.all((categories || []).map(async (c) => {
    const r = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category_id', c.id);
    if (r.error) throw new Error(`for-pros count ${c.slug}: ${r.error.message}`);
    return r.count || 0;
  }));
  const rows = (categories || []).map((c, i) => ({ ...c, count: counts[i] })).filter((c) => c.count > 0);
  const total = rows.reduce((n, c) => n + c.count, 0);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqPageJsonLd(FOR_PROS_FAQS)) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'For Pros' }]} />
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">For pros: get found by Florida homeowners</h1>
      <p className="text-lg text-gray-600 mb-8">{formatCount(total)} Florida home service businesses are already listed on HireAnyPro. Find yours, claim it free, fix your details and get quote requests.</p>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Find your business</h2>
        <OwnerClaimFinder source="for_pros" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Pick your trade</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-10 text-sm">
        {rows.map((c) => (
          <li key={c.slug} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex justify-between">
            <Link href={`/for-pros/${c.slug}`} className="text-blue-800 hover:underline">{c.name}</Link>
            <span className="text-gray-500">{formatCount(c.count)} listed</span>
          </li>
        ))}
      </ul>
      <h2 id="faq" className="text-2xl font-bold text-gray-900 mb-4">Questions from Florida pros</h2>
      <div className="space-y-3 mb-10">
        {FOR_PROS_FAQS.map((f) => (
          <details key={f.q} className="bg-white border border-gray-200 rounded-lg p-4 group">
            <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between items-center">
              {f.q}
              <span className="text-gray-400 group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
            </summary>
            <p className="text-gray-700 text-sm mt-2">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="text-sm text-gray-600">Plans: Free, Pro $9/month, Featured $49.99/month. <Link href="/pricing?src=for_pros&cmp=index" className="text-blue-800 hover:underline">Compare plans</Link>. Cancel anytime.</p>
    </div>
  );
}
