import { notFound } from 'next/navigation';
import CategoryFilters from '@/components/CategoryFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CategorySummary, CategoryCounties, CategoryFaq } from '@/components/CategoryHub';
import { supabase } from '@/lib/supabase';
import { stateName } from '@/lib/geo';
import { CARD_COLUMNS, toCard, getCategoryCities, getCategoryBySlug, getCategoryRollup, type CardListing } from '@/lib/listings';
import { formatCount, lowerCategory, shouldIndexCityPage, type CategoryNarrativeInput } from '@/lib/directory-content';

// Cached pages (ISR): rendered on first request, then served from Vercel's cache and refreshed in the background.
// Returning [] means nothing is prerendered at build time; every path is generated on demand and cached.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function categoryNarrative(category: { id: string; name: string; slug: string }): Promise<CategoryNarrativeInput> {
  const [cityGroups, rollup] = await Promise.all([
    getCategoryCities(category.id),
    getCategoryRollup(category.id),
  ]);
  const total = cityGroups.reduce((n, g) => n + g.count, 0);
  const topCities = [...cityGroups].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  // Prefer the city-group total (every listing with a city). Rollup matches it for FL/GA/AL; use it for ratings and counties.
  const aligned = rollup.total === total;
  return {
    categoryName: category.name,
    categorySlug: category.slug,
    total,
    cityCount: cityGroups.length,
    byState: rollup.byState,
    rated: aligned ? rollup.rated : 0,
    avg: aligned ? rollup.avg : 0,
    totalReviews: aligned ? rollup.totalReviews : 0,
    withPhone: aligned ? rollup.withPhone : 0,
    withWebsite: aligned ? rollup.withWebsite : 0,
    counties: rollup.counties,
    topCities,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Category Not Found' };
  const story = await categoryNarrative(category);
  const lcName = lowerCategory(category.name);
  const top = story.topCities[0];
  const title = `${category.name} Pros in Florida: ${formatCount(story.total)} Listings by City | HireAnyPro`;
  const description = top
    ? `Compare ${formatCount(story.total)} ${lcName} pros in ${formatCount(story.cityCount)} cities${story.counties[0] ? `, led by ${story.counties[0].county} County` : ''}. Most listings are in ${top.name}. Ratings and free quotes.`
    : `Compare ${lcName} pros in Florida. Ratings and free quotes on HireAnyPro.`;
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

  const cityGroups = await getCategoryCities(category.id);
  const story = await categoryNarrative(category);
  const totalCount = story.total;

  // Top listings only, with card fields only. (This page used to ship ~1,000 full listing records: 2.2 MB of HTML.)
  const { data: topRows } = await supabase
    .from('listings')
    .select(CARD_COLUMNS)
    .eq('category_id', category.id)
    .eq('state', 'FL')
    .order('featured', { ascending: false })
    .order('tier', { ascending: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(120);
  const listings = ((topRows || []) as unknown as CardListing[]).map(toCard);

  const cities = [...new Set(listings.map((l) => l.city).filter(Boolean))].sort();
  // Link only indexable city pages (3+ listings); thin pages are noindex and stay reachable from county hubs.
  const indexableCities = cityGroups.filter((g) => shouldIndexCityPage(g.count));
  const thinCityCount = cityGroups.length - indexableCities.length;
  const popularCities = [...indexableCities].sort((a, b) => b.count - a.count).slice(0, 20);
  const allCities = [...indexableCities].sort((a, b) => a.name.localeCompare(b.name));
  const otherStates = (['GA', 'AL'] as const)
    .map((code) => ({
      code,
      name: stateName(code),
      cities: indexableCities.filter((g) => g.state === code).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    }))
    .filter((s) => s.cities.length > 0);

  const itemList = listings.slice(0, 50);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} in Florida`,
    numberOfItems: itemList.length,
    itemListElement: itemList.map((l, i) => ({
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

  const lcCat = lowerCategory(category.name);

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

        <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-8">
          <Image src={`/categories/${slug}.png`} alt={category.name} fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-blue-900/30" />
          <div className="absolute inset-0 flex items-center px-8">
            <div>
              <span className="text-4xl mb-2 block">{category.icon}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{category.name}</h1>
              <p className="text-blue-100 text-sm mt-1">{formatCount(totalCount)} professionals in {formatCount(cityGroups.length)} cities</p>
            </div>
          </div>
        </div>

        <CategorySummary {...story} />

        {listings.length > 0 ? (
          <>
            <CategoryFilters
              listings={listings}
              cities={cities}
            />
            {totalCount > listings.length && (
              <p className="mt-6 text-sm text-gray-500 text-center">
                Showing the {listings.length} most-reviewed {lcCat} pros in Florida. Pick a city below to see all {formatCount(totalCount)}.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">{category.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 text-sm">Be the first {lcCat} professional listed!</p>
          </div>
        )}

        <CategoryCounties categoryName={category.name} categorySlug={category.slug} counties={story.counties} />

        {otherStates.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{category.name} outside Florida</h2>
            {otherStates.map((st) => (
              <div key={st.code} className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{st.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {st.cities.map((city) => (
                    <Link
                      key={city.slug}
                      href={`/services/${slug}/${city.slug}`}
                      className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                    >
                      {city.name} ({city.count.toLocaleString('en-US')})
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <CategoryFaq {...story} />

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
            {thinCityCount > 0 && (
              <p className="mt-4 text-sm text-gray-500">
                Plus {formatCount(thinCityCount)} smaller {thinCityCount === 1 ? 'town' : 'towns'} with one or two {lcCat} listings, shown on each county page above.
              </p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
