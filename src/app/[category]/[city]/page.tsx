import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CategoryFilters from '@/components/CategoryFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { citySlug, cityFromSlug, getCountyForCity, countySlug } from '@/lib/geo';

type Props = { params: Promise<{ category: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: catSlug, city: cSlug } = await params;

  const { data: cat } = await supabase.from('categories').select('name, slug').eq('slug', catSlug).single();
  if (!cat) return { title: 'Not Found' };

  // Find the actual city name
  const { data: cityRows } = await supabase
    .from('listings')
    .select('city')
    .eq('category_id', (await supabase.from('categories').select('id').eq('slug', catSlug).single()).data?.id || '')
    .limit(5000);

  const cities = [...new Set((cityRows || []).map(l => l.city).filter(Boolean))];
  const cityName = cityFromSlug(cSlug, cities);
  if (!cityName) return { title: 'Not Found' };

  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', (await supabase.from('categories').select('id').eq('slug', catSlug).single()).data?.id || '')
    .eq('city', cityName);

  const title = `Best ${cat.name} in ${cityName}, FL | HireAnyPro`;
  const description = `Find top-rated ${cat.name.toLowerCase()} professionals in ${cityName}, Florida. Compare ${count || 0} verified pros, read reviews, and get free quotes.`;

  return {
    title,
    description,
    alternates: { canonical: `https://hireanypro.com/${catSlug}/${cSlug}` },
    openGraph: { title, description, url: `https://hireanypro.com/${catSlug}/${cSlug}`, siteName: 'HireAnyPro' },
  };
}

export const revalidate = 300;

export default async function CityLandingPage({ params }: Props) {
  const { category: catSlug, city: cSlug } = await params;

  const { data: category } = await supabase.from('categories').select('*').eq('slug', catSlug).single();
  if (!category) notFound();

  // Get all listings for this category to find the city
  const { data: allListings } = await supabase
    .from('listings')
    .select('*, categories(name, slug, icon)')
    .eq('category_id', category.id)
    .order('featured', { ascending: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false });

  const allCities = [...new Set((allListings || []).map(l => l.city).filter(Boolean))].sort();
  const cityName = cityFromSlug(cSlug, allCities);
  if (!cityName) notFound();

  const listings = (allListings || []).filter(l => l.city === cityName);
  const county = getCountyForCity(cityName);

  // Related services: other categories in this city
  const { data: otherCatRows } = await supabase
    .from('listings')
    .select('category_id, categories(name, slug)')
    .eq('city', cityName)
    .neq('category_id', category.id)
    .limit(1000);

  const relatedCategories = [...new Map(
    (otherCatRows || [])
      .filter(r => r.categories)
      .map(r => [
        (r.categories as unknown as { slug: string }).slug,
        r.categories as unknown as { name: string; slug: string },
      ])
  ).values()].slice(0, 12);

  // Nearby cities (same category, different city)
  const nearbyCities = allCities.filter(c => c !== cityName).slice(0, 12);

  // JSON-LD
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} in ${cityName}, Florida`,
    numberOfItems: listings.length,
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
      { '@type': 'ListItem', position: 2, name: category.name, item: `https://hireanypro.com/category/${category.slug}` },
      { '@type': 'ListItem', position: 3, name: cityName },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: category.name, href: `/category/${category.slug}` },
          { label: cityName },
        ]} />

        {/* Hero Banner */}
        <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-8">
          <Image src={`/categories/${category.slug}.png`} alt={`${category.name} in ${cityName}`} fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-blue-900/30" />
          <div className="absolute inset-0 flex items-center px-8">
            <div>
              <span className="text-4xl mb-2 block">{category.icon}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{category.name} in {cityName}, Florida</h1>
              <p className="text-blue-100 text-sm mt-1">{listings.length} professionals found</p>
            </div>
          </div>
        </div>

        {listings.length > 0 ? (
          <CategoryFilters
            listings={listings}
            cities={[cityName]}
          />
        ) : (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">{category.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No {category.name.toLowerCase()} found in {cityName}</h3>
            <p className="text-gray-500 text-sm">Try browsing all <Link href={`/category/${category.slug}`} className="text-blue-800 hover:underline">{category.name}</Link> in Florida.</p>
          </div>
        )}

        {/* Related Services in this City */}
        {relatedCategories.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Related Services in {cityName}</h2>
            <div className="flex flex-wrap gap-2">
              {relatedCategories.map(rc => (
                <Link
                  key={rc.slug}
                  href={`/${rc.slug}/${cSlug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {rc.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{category.name} in Nearby Cities</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities.map(nc => (
                <Link
                  key={nc}
                  href={`/${catSlug}/${citySlug(nc)}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {nc}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* County link */}
        {county && (
          <section className="mt-12 p-6 bg-blue-50 rounded-xl">
            <p className="text-gray-700">
              Browse all home services in{' '}
              <Link href={`/region/${countySlug(county)}`} className="text-blue-800 font-semibold hover:underline">
                {county} County
              </Link>
            </p>
          </section>
        )}
      </div>
    </>
  );
}
