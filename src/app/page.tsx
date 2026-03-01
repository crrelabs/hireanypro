import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import CategoryCard from '@/components/CategoryCard';
import ListingCard from '@/components/ListingCard';
import Link from 'next/link';
import { getAllCounties, countySlug, getCitiesInCounty, citySlug } from '@/lib/geo';

export const revalidate = 300; // ISR every 5 min

export default async function HomePage() {
  const [{ data: categories }, { data: featuredListings }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('listings').select('*, categories(name, slug, icon)').eq('featured', true).order('rating', { ascending: false }).limit(6),
  ]);

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
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Pros</h2>
              <p className="text-gray-500 mt-1">Top-rated service providers in your area</p>
            </div>
            <Link href="/search" className="text-blue-800 hover:text-blue-600 text-sm font-medium hidden sm:block">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings?.map((listing) => (
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
            { icon: '✅', title: 'Verified Reviews', desc: 'Real reviews from real customers help you make informed decisions.' },
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
            {getAllCounties().map(county => {
              const cities = getCitiesInCounty(county);
              const topCities = cities.slice(0, 8);
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
                    {cities.length > 8 && (
                      <Link href={`/region/${countySlug(county)}`} className="text-sm text-blue-800 font-medium px-2 py-1">
                        +{cities.length - 8} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Popular service+city combos for SEO */}
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Services by City</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                { cat: 'plumbing', city: 'Miami', label: 'Plumbers in Miami' },
                { cat: 'electrical', city: 'Miami', label: 'Electricians in Miami' },
                { cat: 'roofing', city: 'Miami', label: 'Roofers in Miami' },
                { cat: 'hvac', city: 'Miami', label: 'HVAC in Miami' },
                { cat: 'plumbing', city: 'Fort Lauderdale', label: 'Plumbers in Ft. Lauderdale' },
                { cat: 'electrical', city: 'Fort Lauderdale', label: 'Electricians in Ft. Lauderdale' },
                { cat: 'roofing', city: 'Fort Lauderdale', label: 'Roofers in Ft. Lauderdale' },
                { cat: 'plumbing', city: 'Orlando', label: 'Plumbers in Orlando' },
                { cat: 'electrical', city: 'Orlando', label: 'Electricians in Orlando' },
                { cat: 'hvac', city: 'Orlando', label: 'HVAC in Orlando' },
                { cat: 'plumbing', city: 'West Palm Beach', label: 'Plumbers in West Palm Beach' },
                { cat: 'roofing', city: 'West Palm Beach', label: 'Roofers in West Palm Beach' },
                { cat: 'plumbing', city: 'Coral Gables', label: 'Plumbers in Coral Gables' },
                { cat: 'landscaping', city: 'Miami', label: 'Landscaping in Miami' },
                { cat: 'painting', city: 'Miami', label: 'Painters in Miami' },
                { cat: 'general-contractor', city: 'Miami', label: 'Contractors in Miami' },
                { cat: 'pool-service', city: 'Miami', label: 'Pool Service in Miami' },
                { cat: 'cleaning', city: 'Miami', label: 'Cleaning in Miami' },
              ].map(({ cat, city, label }) => (
                <Link
                  key={`${cat}-${city}`}
                  href={`/services/${cat}/${citySlug(city)}`}
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
          <p className="text-orange-100 mb-6 max-w-xl mx-auto">Claim your free listing and reach thousands of homeowners looking for your services.</p>
          <Link href="/search" className="inline-block bg-white text-orange-600 font-semibold px-8 py-3 rounded-lg hover:bg-orange-50 transition-colors">
            Claim Your Listing
          </Link>
        </div>
      </section>
    </>
  );
}
