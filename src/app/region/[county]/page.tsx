import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllCounties, countyFromSlug, getCitiesInCounty, citySlug, countySlug } from '@/lib/geo';

type Props = { params: Promise<{ county: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: slug } = await params;
  const counties = await getAllCounties();
  const countyName = countyFromSlug(slug, counties);
  if (!countyName) return { title: 'Not Found' };

  const title = `Home Services in ${countyName} County, FL | HireAnyPro`;
  const description = `Find trusted home service professionals in ${countyName} County, Florida. Browse plumbers, electricians, HVAC techs, roofers, and more.`;

  return {
    title,
    description,
    alternates: { canonical: `https://hireanypro.com/region/${slug}` },
    openGraph: { title, description, url: `https://hireanypro.com/region/${slug}`, siteName: 'HireAnyPro' },
  };
}

export const revalidate = 300;

export default async function CountyPage({ params }: Props) {
  const { county: slug } = await params;
  const counties = await getAllCounties();
  const countyName = countyFromSlug(slug, counties);
  if (!countyName) notFound();

  const knownCities = await getCitiesInCounty(countyName);

  // Get all listings in these cities. Paginate: Supabase returns at most 1,000 rows per request,
  // so the old .limit(5000) silently undercounted big counties.
  type Row = { city: string | null; categories: unknown };
  const listings: Row[] = [];
  for (let from = 0; knownCities.length > 0; from += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('city, categories(name, slug, icon)')
      .in('city', knownCities)
      .order('id')
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    listings.push(...(data as Row[]));
    if (data.length < 1000) break;
  }

  // Aggregate: categories with counts, and per-category city counts (so we only link pages that exist).
  const catMap = new Map<string, { name: string; slug: string; icon: string; count: number; cities: Map<string, number> }>();
  const cityTop = new Map<string, Map<string, number>>();

  for (const l of listings) {
    const cat = l.categories as { name: string; slug: string; icon: string } | null;
    if (!cat || !l.city) continue;
    const existing = catMap.get(cat.slug) || { ...cat, count: 0, cities: new Map<string, number>() };
    existing.count++;
    existing.cities.set(l.city, (existing.cities.get(l.city) || 0) + 1);
    catMap.set(cat.slug, existing);
    const ct = cityTop.get(l.city) || new Map<string, number>();
    ct.set(cat.slug, (ct.get(cat.slug) || 0) + 1);
    cityTop.set(l.city, ct);
  }

  const categories = [...catMap.values()].sort((a, b) => b.count - a.count);
  const cities = [...cityTop.keys()].sort();
  const topCatForCity = (city: string) => [...(cityTop.get(city) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCitiesForCat = (c: { cities: Map<string, number> }) => [...c.cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city]) => city);
  const totalListings = listings.length;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hireanypro.com' },
      { '@type': 'ListItem', position: 2, name: `${countyName} County` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: `${countyName} County` },
        ]} />

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Home Services in {countyName} County, Florida
          </h1>
          <p className="text-gray-600 text-lg">
            {totalListings.toLocaleString()} professionals across {cities.length} cities and {categories.length} service categories.
          </p>
        </div>

        {/* Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.slug} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <Link href={`/category/${cat.slug}`} className="font-semibold text-gray-900 hover:text-blue-800">
                      {cat.name}
                    </Link>
                    <p className="text-sm text-gray-500">{cat.count} pros in {countyName} County</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {topCitiesForCat(cat).map(city => (
                    <Link
                      key={city}
                      href={`/services/${cat.slug}/${citySlug(city)}`}
                      className="text-xs text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cities */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Cities in {countyName} County</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cities.map(city => (
              <Link
                key={city}
                href={`/services/${topCatForCity(city) || categories[0]?.slug || 'plumbing'}/${citySlug(city)}`}
                className="px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-gray-700 hover:text-blue-800 font-medium text-sm"
              >
                {city}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
