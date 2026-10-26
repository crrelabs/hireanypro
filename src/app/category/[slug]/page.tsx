import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CategoryFilters from '@/components/CategoryFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CARD_COLUMNS, toCard, getCategoryCities, getCategoryBySlug, type CardListing } from '@/lib/listings';

// Cached pages (ISR): rendered on first request, then served from Vercel's cache and refreshed in the background.
// Returning [] means nothing is prerendered at build time; every path is generated on demand and cached.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: category } = await supabase.from('categories').select('name').eq('slug', slug).single();
  if (!category) return { title: 'Category Not Found' };
  const lcName = category.name.split(' ').map((w: string) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');
  const title = `Best ${category.name} Pros in Florida: Compare Ratings & Get Free Quotes | HireAnyPro`;
  const description = `Find top-rated ${lcName} professionals in Florida. Compare ratings, read reviews, and request free quotes on HireAnyPro.`;
  return {
    title,
    description,
    alternates: { canonical: `https://hireanypro.com/category/${slug}` },
    openGraph: { title, description, url: `https://hireanypro.com/category/${slug}`, siteName: 'HireAnyPro' },
  };
}

export const revalidate = 300;

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // Every city in the category with counts (complete, not capped at 1,000 rows).
  const cityGroups = await getCategoryCities(category.id);
  const totalCount = cityGroups.reduce((n, g) => n + g.count, 0);

  // Top listings only, with card fields only. (This page used to ship ~1,000 full listing records: 2.2 MB of HTML.)
  const { data: topRows } = await supabase
    .from('listings')
    .select(CARD_COLUMNS)
    .eq('category_id', category.id)
    .order('featured', { ascending: false })
    .order('tier', { ascending: false }) // 'pro' sorts above 'free'
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(120);
  const listings = ((topRows || []) as unknown as CardListing[]).map(toCard);

  const cities = [...new Set(listings.map((l) => l.city).filter(Boolean))].sort();
  const popularCities = [...cityGroups].sort((a, b) => b.count - a.count).slice(0, 20);
  const allCities = [...cityGroups].sort((a, b) => a.name.localeCompare(b.name));

  // JSON-LD
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} in Florida`,
    numberOfItems: totalCount,
    itemListElement: listings.slice(0, 50).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://hireanypro.com/listing/${l.slug}`,
      name: l.name,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hireanypro.com' },
      { '@type': 'ListItem', position: 2, name: category.name },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Categories', href: '/categories' },
          { label: category.name },
        ]} />

        {/* Hero Banner */}
        <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-8">
          <Image src={`/categories/${slug}.png`} alt={category.name} fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-blue-900/30" />
          <div className="absolute inset-0 flex items-center px-8">
            <div>
              <span className="text-4xl mb-2 block">{category.icon}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{category.name}</h1>
              <p className="text-blue-100 text-sm mt-1">{totalCount.toLocaleString('en-US')} professionals in {cityGroups.length} cities in Florida and nearby</p>
            </div>
          </div>
        </div>

        {listings.length > 0 ? (
          <>
            <CategoryFilters
              listings={listings}
              cities={cities}
            />
            {totalCount > listings.length && (
              <p className="mt-6 text-sm text-gray-500 text-center">
                Showing the {listings.length} most-reviewed {category.name.toLowerCase()} pros statewide. Pick your city below to see all {totalCount.toLocaleString('en-US')}.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">{category.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 text-sm">Be the first {category.name.toLowerCase()} professional listed!</p>
          </div>
        )}

        {/* Popular Cities */}
        {popularCities.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Cities for {category.name}</h2>
            <div className="flex flex-wrap gap-2">
              {popularCities.map(({ name: city, slug: cSlug, count, state }) => (
                <Link
                  key={cSlug}
                  href={`/services/${slug}/${cSlug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {city}{state !== 'FL' ? `, ${state}` : ''} ({count})
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Every city, so each city page is one click from the category hub */}
        {allCities.length > popularCities.length && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{category.name} in Every City We Cover</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1 text-sm">
              {allCities.map(({ name, slug: cSlug, count, state }) => (
                <li key={cSlug}>
                  <Link href={`/services/${slug}/${cSlug}`} className="text-gray-600 hover:text-blue-800 hover:underline">
                    {name}{state !== 'FL' ? `, ${state}` : ''} <span className="text-gray-400">({count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
