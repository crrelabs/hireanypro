import { supabase } from '@/lib/supabase';
import { getCategoryBySlug, getCategoryCities, getCategoryRollup } from '@/lib/listings';
import { shouldIndexCityPage, lowerCategory, formatCount } from '@/lib/directory-content';

export type ProsCategoryStory = {
  name: string;
  slug: string;
  lc: string;
  total: number;
  cityCount: number;
  claimed: number;
  rated: number;
  avg: number;
  totalReviews: number;
  topCities: { name: string; slug: string; count: number; indexable: boolean }[];
};

/** Real numbers for the /for-pros/<category> owner landing page. Throws on DB errors so ISR keeps the last good page. */
export async function getProsCategoryStory(slug: string): Promise<ProsCategoryStory | null> {
  const category = await getCategoryBySlug(slug);
  if (!category) return null;
  const [cities, rollup, claimedRes] = await Promise.all([
    getCategoryCities(category.id),
    getCategoryRollup(category.id),
    supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('category_id', category.id).eq('claimed', true).not('slug', 'like', 'zz-hap-test%'),
  ]);
  if (claimedRes.error) throw new Error(`for-pros claimed ${slug}: ${claimedRes.error.message}`);
  const total = cities.reduce((n, g) => n + g.count, 0);
  const aligned = rollup.total === total;
  const topCities = [...cities]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12)
    .map((c) => ({ name: c.name, slug: c.slug, count: c.count, indexable: shouldIndexCityPage(c.count) }));
  return {
    name: category.name,
    slug: category.slug,
    lc: lowerCategory(category.name),
    total,
    cityCount: cities.length,
    claimed: claimedRes.count || 0,
    rated: aligned ? rollup.rated : 0,
    avg: aligned ? rollup.avg : 0,
    totalReviews: aligned ? rollup.totalReviews : 0,
    topCities,
  };
}

export function prosFaqs(s: ProsCategoryStory): { q: string; a: string }[] {
  return [
    { q: `Is it free to list my ${s.lc} business on HireAnyPro?`, a: `Yes. ${formatCount(s.total)} Florida ${s.lc} businesses are already listed from public data, and claiming your listing is free with no credit card. You can edit your phone, hours, services and description after claiming.` },
    { q: `How do I find my ${s.lc} listing?`, a: 'Type your business name in the search box on this page (add ", city" to narrow it down) and pick your business. If you are not listed yet, email iris@hireanypro.com and we will add you.' },
    { q: 'How does claiming work?', a: 'Pick your listing and enter the business email. We email a one-click verification link. If you opened our email sent to the address on your listing, you can claim in one click without a verification email.' },
    { q: 'What does Pro add?', a: 'Pro is $9/month. Your phone, email and website are shown on your listing, you rank above free listings on city and category pages, you get a Verified badge, and every quote request comes with the customer’s full contact details. Cancel anytime.' },
    { q: 'What does Featured add?', a: 'Featured is $49.99/month. It includes everything in Pro, plus the top placement on your city and category pages, a highlighted listing card and a spot on the homepage. Cancel anytime.' },
    { q: 'Is there a contract?', a: 'No. Paid plans are month to month and you can cancel anytime. The free listing stays free.' },
  ];
}
