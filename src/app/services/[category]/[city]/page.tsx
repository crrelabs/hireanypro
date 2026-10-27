import { notFound, permanentRedirect } from 'next/navigation';
import CategoryFilters from '@/components/CategoryFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CityIntro, CityStatsBlock, CityFaq } from '@/components/CityInsights';
import CityQuoteForm from '@/components/CityQuoteForm';
import { getCountyForCity, getCitiesInCounty, countySlug, stateName } from '@/lib/geo';
import {
  toCard,
  getCategoryCities,
  getCategoryBySlug,
  getCityPageRows,
  getCitySiblingCategories,
  type CardListing,
  type CityPageRow,
} from '@/lib/listings';
import {
  computeCityStats,
  lowerCategory,
  neighborsInCounty,
  neighborsInState,
  shouldIndexCityPage,
} from '@/lib/directory-content';

// Cached pages (ISR): rendered on first request, then served from Vercel's cache and refreshed in the background.
// Returning [] means nothing is prerendered at build time; every path is generated on demand and cached.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ category: string; city: string }> };

function cityCard(row: CityPageRow): CardListing {
  const categories = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return toCard({
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    state: row.state,
    zip: row.zip,
    rating: row.rating,
    review_count: row.review_count,
    tier: row.tier,
    featured: row.featured,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    categories: categories || undefined,
  } as CardListing);
}

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
  const rows = await getCityPageRows(cat.id, group.variants, st, count);
  const stats = computeCityStats(rows, count);

  const title = `${count > 1 ? `${count} ` : ''}Best ${cat.name} Pros in ${cityName}, ${st} (${new Date().getFullYear()}) | HireAnyPro`;
  const lcName = lowerCategory(cat.name);
  const description = stats.rated > 0
    ? `Compare ${count.toLocaleString('en-US')} ${lcName} ${count === 1 ? 'pro' : 'pros'} in ${cityName}, ${stName}. Average rating ${stats.avg.toFixed(1)}/5 across ${stats.totalReviews.toLocaleString('en-US')} reviews. Free quotes.`
    : `Compare ${count.toLocaleString('en-US')} ${lcName} ${count === 1 ? 'pro' : 'pros'} in ${cityName}, ${stName}. See who lists a phone or website and request free quotes.`;

  return {
    title,
    description,
    ...(shouldIndexCityPage(count) ? {} : { robots: { index: false, follow: true } }),
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

  const [rows, siblings, county] = await Promise.all([
    getCityPageRows(category.id, group.variants, group.state, group.count),
    getCitySiblingCategories(group.variants, group.state, category.id),
    group.state === 'FL' ? getCountyForCity(cityName) : Promise.resolve(null),
  ]);
  const listings = rows.slice(0, 500).map(cityCard);
  if (listings.length === 0) notFound();

  const stats = computeCityStats(rows, group.count);
  // Neighbor links stay inside the county (Florida) or the same state (GA/AL), so they are not the same 12 cities on every page.
  // A city is a neighbor only when this county is its primary county (the county column on most of its listings).
  // Otherwise one mistagged row would link the whole Sarasota page from a DeSoto page.
  const countyCities = county ? await getCitiesInCounty(county) : [];
  const primaryCountyCities = county
    ? (await Promise.all(countyCities.map(async (name) => ((await getCountyForCity(name)) === county ? name : null)))).filter((name): name is string => !!name)
    : [];
  const neighbors = (county
    ? neighborsInCounty(cityGroups, primaryCountyCities, cSlug, group.state)
    : neighborsInState(cityGroups, cSlug, group.state)
  ).slice(0, 12);

  const copy = {
    categoryName: category.name,
    categorySlug: category.slug,
    cityName,
    citySlug: cSlug,
    stateCode: group.state,
    stateName: stName,
    county,
    count: group.count,
    stats,
    neighbors,
    siblings,
  };

  const itemList = listings.slice(0, 50);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} in ${cityName}, ${stName}`,
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

        <CityIntro {...copy} />
        <CityStatsBlock categoryName={category.name} cityName={cityName} count={group.count} stats={stats} />

        <CityQuoteForm categorySlug={category.slug} categoryName={category.name} citySlug={cSlug} cityName={cityName} />

        <CategoryFilters
          listings={listings}
          cities={[cityName]}
        />

        <CityFaq {...copy} />

        {siblings.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Other services in {cityName}</h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((rc) => (
                <Link
                  key={rc.slug}
                  href={`/services/${rc.slug}/${cSlug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {rc.name} ({rc.count.toLocaleString('en-US')})
                </Link>
              ))}
            </div>
          </section>
        )}

        {neighbors.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {category.name} in {county ? `other ${county} County cities` : `other ${stName} cities`}
            </h2>
            <div className="flex flex-wrap gap-2">
              {neighbors.map((nc) => (
                <Link
                  key={nc.slug}
                  href={`/services/${catSlug}/${nc.slug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
                >
                  {nc.name}{nc.state !== 'FL' ? `, ${nc.state}` : ''} ({nc.count.toLocaleString('en-US')})
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 p-6 bg-blue-50 rounded-xl space-y-2">
          <p className="text-gray-700">
            <Link href={`/category/${category.slug}`} className="text-blue-800 font-semibold hover:underline">
              All {lowerCategory(category.name)} pros
            </Link>
            {' '}across Florida and nearby cities.
          </p>
          {county && (
            <p className="text-gray-700">
              <Link href={`/region/${countySlug(county)}`} className="text-blue-800 font-semibold hover:underline">
                All home services in {county} County
              </Link>
            </p>
          )}
        </section>
      </div>
    </>
  );
}
