import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getHubCities, hubHref } from '@/lib/city-hubs';
import { getCountyData, countySlug } from '@/lib/geo';
import { formatCount } from '@/lib/directory-content';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Florida Cities: Compare Local Home Service Pros | HireAnyPro',
  description: 'Every Florida city with HireAnyPro city pages: compare plumbers, roofers, electricians, HVAC and 18 more services, with Google ratings and free quotes.',
  alternates: { canonical: 'https://hireanypro.com/cities' },
};

export default async function CitiesIndexPage() {
  const [hubs, countyMap] = await Promise.all([getHubCities(), getCountyData()]);
  const groups = new Map<string, typeof hubs>();
  for (const h of hubs) {
    const key = h.state === 'FL' ? countyMap.primary[h.name.toLowerCase()] || 'Other Florida' : h.state === 'GA' ? 'Georgia' : h.state === 'AL' ? 'Alabama' : h.state;
    groups.set(key, [...(groups.get(key) || []), h]);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].reduce((s, h) => s + h.total, 0) - a[1].reduce((s, h) => s + h.total, 0));
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cities' }]} />
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Home service pros by city</h1>
      <p className="text-gray-700 mb-8 max-w-3xl">{formatCount(hubs.length)} cities, each with at least 3 services that have 3 or more listed pros. Pick a city to compare every service there.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map(([group, list]) => (
          <section key={group} className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">
              {countyMap.byCounty[group] ? <Link href={`/region/${countySlug(group)}`} className="hover:text-blue-800">{group} County</Link> : group}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {list.map((h) => (
                <li key={h.slug}>
                  <Link href={hubHref(h.slug)} className="inline-block px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-700 hover:text-blue-800">
                    {h.name} ({formatCount(h.total)})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
