import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import CategoryCard from '@/components/CategoryCard';
import ListingCard from '@/components/ListingCard';
import Link from 'next/link';
import QuoteFinder from '@/components/QuoteFinder';
import OwnerClaimFinder from '@/components/OwnerClaimFinder';
import { getCountyData, primaryCitiesInCounty, countySlug, citySlug } from '@/lib/geo';
import { getCategoryCities, getCategoryBySlug } from '@/lib/listings';
import { shouldIndexCityPage } from '@/lib/directory-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://hireanypro.com' },
};

export const revalidate = 3600; // ISR hourly (counts change daily at most)

const POPULAR_CATEGORIES: { slug: string; noun: string }[] = [
  { slug: 'plumbing', noun: 'Plumbers' },
  { slug: 'hvac', noun: 'HVAC Pros' },
  { slug: 'roofing', noun: 'Roofers' },
  { slug: 'electrical', noun: 'Electricians' },
  { slug: 'general-contractor', noun: 'Contractors' },
  { slug: 'pest-control', noun: 'Pest Control' },
];

/** Top 3 Florida cities (by listing count) for each popular category. Only indexable pages, never a hardcoded guess. */
async function popularCombos(): Promise<{ cat: string; slug: string; label: string }[]> {
  const out: { cat: string; slug: string; label: string }[] = [];
  for (const { slug, noun } of POPULAR_CATEGORIES) {
    const cat = await getCategoryBySlug(slug);
    if (!cat) continue;
    const groups = (await getCategoryCities(cat.id))
      .filter((g) => g.state === 'FL' && shouldIndexCityPage(g.count))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    for (const g of groups) out.push({ cat: slug, slug: g.slug, label: `${noun} in ${g.name}` });
  }
  return out;
}

export default async function HomePage() {
  const [{ data: categories }, { data: featuredListings }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('listings').select('*, categories(name, slug, icon)').eq('featured', true).order('rating', { ascending: false }).limit(6),
  ]);
  // No Featured subscribers yet: show Pro and top-reviewed pros instead of an empty grid.
  let showcase = featuredListings || [];
  const hasFeatured = showcase.length > 0;
  if (showcase.length < 6) {
    // Fewer than 6 Featured subscribers: fill the rest of the grid with Pro and top-reviewed pros (Featured stay first).
    const { data: top } = await supabase.from('listings').select('*, categories(name, slug, icon)')
      .gte('rating', 4.7).not('slug', 'like', 'zz-hap-test%')
      .order('tier', { ascending: false }).order('review_count', { ascending: false, nullsFirst: false }).limit(18);
    // Same business can be listed in several categories; show each name once.
    const seen = new Set<string>(showcase.map((l) => String(l.name || '').toLowerCase()));
    showcase = [...showcase, ...(top || []).filter((l) => { const k = String(l.name || '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })].slice(0, 6);
  }

  // Count listings per category using exact counts to avoid 1000-row limit
  const countMap: Record<string, number> = {};
  if (categories) {
    const counts = await Promise.all(
      categories.map((cat) =>
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category_id', cat.id)
      )
    );
    categories.forEach((cat, i) => {
      countMap[cat.id] = counts[i].count || 0;
    });
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Find Trusted <span className="text-orange-400">Home Service</span> Pros
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8">
              Connect with top-rated plumbers, electricians, roofers, and more in Florida.
            </p>
            <SearchBar large />
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-blue-200">
              <span>Popular:</span>
              {['Plumbing', 'HVAC', 'Electrical', 'Roofing'].map((q) => (
                <Link key={q} href={`/search?q=${q}`} className="hover:text-white transition-colors underline underline-offset-2">
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quote finder: homeowners who don't want to browse can ask up to 3 pros at once (form=home_multi_quote). */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <QuoteFinder source="home" categories={(categories || []).map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))} className="shadow-lg bg-white" />
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Browse by Category</h2>
          <p className="text-gray-500 mt-2">Find the right pro for any home project</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories?.map((cat) => (
            <CategoryCard key={cat.id} category={cat} count={countMap[cat.id] || 0} />
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{hasFeatured ? 'Featured Pros' : 'Top-Rated Pros'}</h2>
              <p className="text-gray-500 mt-1">Top-rated service providers in your area</p>
            </div>
            <Link href="/search" className="text-blue-800 hover:text-blue-600 text-sm font-medium hidden sm:block">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcase.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Why HireAnyPro?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '⭐', title: 'Real Ratings', desc: 'See each pro’s public customer rating and review count before you reach out.' },
            { icon: '🔍', title: 'Easy Search', desc: 'Find the right pro by category, location, or rating in seconds.' },
            { icon: '💰', title: 'Free to Use', desc: 'Browse listings, read reviews, and contact pros — all completely free.' },
          ].map((item) => (
            <div key={item.title} className="text-center p-6">
              <span className="text-4xl mb-4 block">{item.icon}</span>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by City */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Browse by Location</h2>
            <p className="text-gray-500 mt-2">Find home service professionals in your area</p>
          </div>

          {/* Region cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {await (async () => {
              const [countyMap, plumbing] = await Promise.all([
                getCountyData(),
                // Only link cities that actually have a plumbing page (linking every city produced ~175 broken links).
                getCategoryBySlug('plumbing'),
              ]);
              const counties = Object.keys(countyMap.byCounty).sort();
              // Thin plumbing pages (fewer than 3 listings) are noindex, so they are not linked from the homepage.
              const plumbingCities = new Map((plumbing ? await getCategoryCities(plumbing.id) : []).filter((g) => shouldIndexCityPage(g.count)).map((g) => [g.slug, g.count]));
              return counties.map((county) => {
                // A city can show up under several counties in the raw data (Orlando was linked 21 times);
                // only show it under its primary county, once.
                const cities = [...new Map(primaryCitiesInCounty(countyMap, county).map((c) => [citySlug(c), c])).values()];
                const topCities = cities
                  .filter((c) => plumbingCities.has(citySlug(c)))
                  .sort((a, b) => (plumbingCities.get(citySlug(b)) || 0) - (plumbingCities.get(citySlug(a)) || 0))
                  .slice(0, 8);
                return (
                  <div key={county} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <Link href={`/region/${countySlug(county)}`} className="text-lg font-bold text-blue-800 hover:text-blue-600">
                      {county} County →
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topCities.map(city => (
                        <Link
                          key={city}
                          href={`/services/plumbing/${citySlug(city)}`}
                          className="text-sm text-gray-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          {city}
                        </Link>
                      ))}
                      {topCities.length === 0 ? (
                        // No city here has a full plumbing page yet; a bare "+N more" read like a broken card.
                        <Link href={`/region/${countySlug(county)}`} className="text-sm text-blue-800 font-medium px-2 py-1">
                          See all pros in {county} County{cities.length > 1 ? ` (${cities.length} cities)` : ''} →
                        </Link>
                      ) : cities.length > topCities.length && (
                        <Link href={`/region/${countySlug(county)}`} className="text-sm text-blue-800 font-medium px-2 py-1">
                          +{cities.length - topCities.length} more {cities.length - topCities.length === 1 ? 'city' : 'cities'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Popular service+city combos: the biggest city pages per top category, computed from the data (always indexable). */}
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Services by City</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {(await popularCombos()).map(({ cat, slug, label }) => (
                <Link
                  key={`${cat}-${slug}`}
                  href={`/services/${cat}/${slug}`}
                  className="text-sm text-gray-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg border border-gray-100 transition-colors text-center"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Are You a Home Service Pro?</h2>
          <p className="text-orange-100 mb-6 max-w-xl mx-auto">Your business may already be listed. Find it and claim it free: fix your details and get homeowner quote requests.</p>
          <OwnerClaimFinder source="home_claim_finder" />
          <p className="text-sm text-orange-100 mt-4">
            Free to claim, no card needed. <Link href="/pricing?utm_source=home_claim_finder&utm_medium=web" className="underline font-medium text-white">See Pro and Featured plans</Link>
          </p>
        </div>
      </section>
    </>
  );
}
