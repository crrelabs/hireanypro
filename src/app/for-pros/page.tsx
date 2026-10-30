import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import OwnerClaimFinder from '@/components/OwnerClaimFinder';
import { supabase } from '@/lib/supabase';
import { formatCount } from '@/lib/directory-content';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'For Pros: List Your Florida Home Service Business Free | HireAnyPro',
  description: 'Find your business on HireAnyPro, claim it free and get quote requests from Florida homeowners. Plumbers, electricians, roofers, HVAC and more. Pro $9/mo, Featured $49.99/mo.',
  alternates: { canonical: 'https://hireanypro.com/for-pros' },
};

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
      <p className="text-sm text-gray-600">Plans: Free, Pro $9/month, Featured $49.99/month. <Link href="/pricing" className="text-blue-800 hover:underline">Compare plans</Link>. Cancel anytime.</p>
    </div>
  );
}
