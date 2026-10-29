import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'About HireAnyPro — Florida Home Service Directory',
  description: 'HireAnyPro is a free Florida directory of plumbers, electricians, roofers, HVAC techs and other home service pros, operated by CRRE Labs LLC in Pinecrest, FL.',
  alternates: { canonical: 'https://hireanypro.com/about' },
};

export default async function AboutPage() {
  // Live counts (never hardcode: the weekly cleanup changes them).
  const [{ count: listings }, { count: categories }] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).not('slug', 'like', 'zz-hap-test%'),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ]);
  const n = (x: number | null) => (x ? x.toLocaleString('en-US') : 'thousands of');
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">About HireAnyPro</h1>
      <p className="mb-4">HireAnyPro helps Florida homeowners find and compare local home service pros. The directory lists {n(listings)} businesses across {n(categories)} service categories, from plumbing, HVAC and roofing to pool service, pest control and tree service, organized by county and city.</p>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">For homeowners</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Browsing and requesting quotes is free. There is no sign-up.</li>
        <li>Ratings and review counts come from each business&apos;s public Google reviews, so you can compare pros side by side.</li>
        <li>On city pages you can send one request to up to 3 top-rated pros and compare their answers.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">For businesses</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Every listing starts from public business information. Owners can <Link href="/claim" className="text-blue-800 hover:underline">claim their listing for free</Link> to correct details and see quote requests.</li>
        <li>Optional paid plans (<Link href="/pricing" className="text-blue-800 hover:underline">Pro and Featured</Link>) show your phone and website, deliver full lead details and rank you above free listings. Cancel anytime.</li>
        <li>Want a listing corrected or removed? Email us and we&apos;ll take care of it.</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">Who we are</h2>
      <p className="mb-4">HireAnyPro is operated by CRRE Labs LLC (<a href="https://crrelabs.com" className="text-blue-800 hover:underline" rel="noopener">crrelabs.com</a>), a Florida company based in Pinecrest, Miami-Dade County.</p>
      <ul className="space-y-1">
        <li><strong>Email:</strong> <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a></li>
        <li><strong>Phone / text:</strong> <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a></li>
        <li><strong>Mail:</strong> CRRE Labs LLC, 12394 SW 82 Ave, Pinecrest, FL 33156</li>
      </ul>
      <p className="mt-8"><Link href="/categories" className="text-blue-800 font-semibold hover:underline">Browse all categories →</Link></p>
    </div>
  );
}
