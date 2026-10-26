import { supabase } from '@/lib/supabase';
import { notFound, permanentRedirect } from 'next/navigation';
import CategoryFilters from '@/components/CategoryFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CityIntro, CityFaq } from '@/components/CityInsights';
import CityQuoteForm from '@/components/CityQuoteForm';
import { getCountyForCity, countySlug, stateName } from '@/lib/geo';
import { CARD_COLUMNS, toCard, getCategoryCities, getCategoryBySlug, type CardListing } from '@/lib/listings';

// Cached pages (ISR): rendered on first request, then served from Vercel's cache and refreshed in the background.
// Returning [] means nothing is prerendered at build time; every path is generated on demand and cached.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ category: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: catSlug, city: cSlug } = await params;

  const cat = await getCategoryBySlug(catSlug);
  if (!cat) return { title: 'Not Found' };

  const group = (await getCategoryCities(cat.id)).find((g) => g.slug === cSlug);
  if (!group) return { title: 'Not Found' };
  const cityName = group.name;
  const count = group.count;
  const st = group.state;
  const stName = stateName(st);

  const title = `${count > 1 ? `${count} ` : ''}Best ${cat.name} Pros in ${cityName}, ${st} (${new Date().getFullYear()}) | HireAnyPro`;
  const lcName = cat.name.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');
  const description = `Compare ${count} ${lcName} ${count === 1 ? 'pro' : 'pros'} in ${cityName}, ${stName}: ratings, reviews, ZIP codes served and FAQs. Get up to 3 free quotes, no obligation.`;

  return {
    title,
    description,
    alternates: { canonical: `https://hireanypro.com/services/${catSlug}/${cSlug}` },
    openGraph: { title, description, url: `https://hireanypro.com/services/${catSlug}/${cSlug}`, siteName: 'HireAnyPro' },
  };
}

export const revalidate = 3600; // hourly: fewer slow cold renders (crawls were timing out)

export default async function CityLandingPage({ params }: Props) {
  const { category: catSlug, city: cSlug } = await params;

  const category = await getCategoryBySlug(catSlug);
  if (!category) notFound();

  // Resolve the city from ALL cities in this category (grouped by slug, so spelling variants share one page).
  const cityGroups = await getCategoryCities(category.id);
  const group = cityGroups.find((g) => g.slug === cSlug);
  if (!group) {
    // Near-border GA/AL cities moved from /valdosta to /valdosta-ga on 2026-10-25; send old URLs to the new page.
    const moved = cityGroups.find((g) => g.state !== 'FL' && g.slug === `${cSlug}-${g.state.toLowerCase()}`);
    if (moved) permanentRedirect(`/services/${catSlug}/${moved.slug}`);
    notFound();
  }
  const cityName = group.name;
  const stName = stateName(group.state);

  // Query this city's listings directly. (Previously this loaded only the category's top 1,000 listings and
  // filtered by city, so ~15% of city pages in the sitemap returned 404.)
  const { data: cityListings } = await supabase
    .from('listings')
    .select(CARD_COLUMNS)
    .eq('category_id', category.id)
    .in('city', group.variants)
    .eq('state', group.state)
    .order('featured', { ascending: false })
    .order('tier', { ascending: false }) // 'pro' sorts above 'free'
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(500);

  const listings = ((cityListings || []) as unknown as CardListing[]).map(toCard);
  if (listings.length === 0) notFound();
  // County pages are Florida-only; near-border GA/AL cities have no Florida county.
  const county = group.state === 'FL' ? await getCountyForCity(cityName) : null;

  // Related services: other categories in this city
  const { data: otherCatRows } = await supabase
    .from('listings')
    .select('category_id, categories(name, slug)')
    .in('city', group.variants)
    .eq('state', group.state)
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
  const nearbyCities = [...cityGroups].filter(g => g.slug !== cSlug).sort((a, b) => b.count - a.count).slice(0, 12);

  // JSON-LD
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} in ${cityName}, ${stName}`,
    numberOfItems: group.count,
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
              <h1 className="text-2xl md:text-3xl font-bold text-white">{category.name} in {cityName}, {stName}</h1>
              <p className="text-blue-100 text-sm mt-1">{group.count} {group.count === 1 ? 'professional' : 'professionals'} found</p>
            </div>
          </div>
        </div>

        <CityIntro categoryName={category.name} cityName={cityName} count={group.count} listings={listings} stateName={stName} />

        <CityQuoteForm categorySlug={category.slug} categoryName={category.name} citySlug={cSlug} cityName={cityName} />

        <CategoryFilters
          listings={listings}
          cities={[cityName]}
        />

        <CityFaq categoryName={category.name} categorySlug={category.slug} cityName={cityName} citySlug={cSlug} count={group.count} listings={listings} stateCode={group.state} stateName={stName} />

        {/* Related Services in this City */}
        {relatedCategories.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Related Services in {cityName}</h2>
            <div className="flex flex-wrap gap-2">
              {relatedCategories.map(rc => (
                <Link
                  key={rc.slug}
                  href={`/services/${rc.slug}/${cSlug}`}
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
                  key={nc.slug}
                  href={`/services/${catSlug}/${nc.slug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {nc.name}{nc.state !== 'FL' ? `, ${nc.state}` : ''}
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
