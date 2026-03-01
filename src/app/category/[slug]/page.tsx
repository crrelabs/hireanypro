import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CategoryFilters from '@/components/CategoryFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { citySlug } from '@/lib/geo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: category } = await supabase.from('categories').select('name').eq('slug', slug).single();
  if (!category) return { title: 'Category Not Found' };
  const title = `${category.name} in Florida | HireAnyPro`;
  const description = `Find top-rated ${category.name.toLowerCase()} professionals in Florida. Compare ratings, read reviews, and request free quotes on HireAnyPro.`;
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

  const { data: category } = await supabase.from('categories').select('*').eq('slug', slug).single();
  if (!category) notFound();

  const { data: listings } = await supabase
    .from('listings')
    .select('*, categories(name, slug, icon)')
    .eq('category_id', category.id)
    .order('featured', { ascending: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false });

  const cities = [...new Set((listings || []).map((l) => l.city).filter(Boolean))].sort();

  // Popular cities by listing count
  const cityCounts = new Map<string, number>();
  for (const l of listings || []) {
    if (l.city) cityCounts.set(l.city, (cityCounts.get(l.city) || 0) + 1);
  }
  const popularCities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // JSON-LD
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} in Florida`,
    numberOfItems: listings?.length || 0,
    itemListElement: (listings || []).slice(0, 50).map((l, i) => ({
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
              <p className="text-blue-100 text-sm mt-1">{listings?.length || 0} professionals in Florida</p>
            </div>
          </div>
        </div>

        {listings && listings.length > 0 ? (
          <CategoryFilters
            listings={listings}
            cities={cities}
          />
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
              {popularCities.map(([city, count]) => (
                <Link
                  key={city}
                  href={`/services/${slug}/${citySlug(city)}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {city} ({count})
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
