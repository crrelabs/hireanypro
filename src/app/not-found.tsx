import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found — HireAnyPro',
};

const POPULAR = [
  ['plumbing', 'Plumbers'], ['electrical', 'Electricians'], ['hvac', 'HVAC'], ['roofing', 'Roofers'],
  ['handyman', 'Handymen'], ['cleaning', 'Cleaning'], ['pest-control', 'Pest Control'], ['landscaping', 'Landscaping'],
];

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">We couldn&apos;t find that page</h1>
      <p className="text-gray-600 mb-8">It may have moved, or the business may no longer be listed. Try a search or browse a popular category.</p>
      <form action="/search" method="get" className="flex gap-2 max-w-md mx-auto mb-10">
        <input name="q" placeholder="Plumber, electrician, city or zip" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" aria-label="Search pros" />
        <button type="submit" className="px-5 py-3 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-700">Search</button>
      </form>
      <div className="flex flex-wrap justify-center gap-2">
        {POPULAR.map(([slug, label]) => (
          <Link key={slug} href={`/category/${slug}`} className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium">
            {label}
          </Link>
        ))}
      </div>
      <p className="mt-10 text-sm text-gray-500">
        Own a business? <Link href="/claim" className="text-blue-800 font-medium hover:underline">Claim your free listing</Link>.
      </p>
    </div>
  );
}
