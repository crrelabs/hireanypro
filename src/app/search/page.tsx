import { supabase, type Listing } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';
import FilterSidebar from '@/components/FilterSidebar';
import MapViewWrapper from '@/components/MapViewWrapper';
import { Suspense } from 'react';

export const revalidate = 60;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; city?: string; rating?: string; page?: string }> }) {
  const params = await searchParams;
  const q = params.q || '';
  const category = params.category || '';
  const city = params.city || '';
  const rating = params.rating ? parseFloat(params.rating) : 0;
  const page = parseInt(params.page || '1', 10);
  const perPage = 12;

  const { data: categories } = await supabase.from('categories').select('*').order('name');

  // Build query
  let query = supabase
    .from('listings')
    .select('*, categories!inner(name, slug, icon)', { count: 'exact' });

  if (q) {
    // Detect zip code (5 digits) vs text search
    const isZip = /^\d{5}$/.test(q.trim());
    if (isZip) {
      query = query.eq('zip', q.trim());
    } else {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
    }
  }
  if (category) {
    query = query.eq('categories.slug', category);
  }
  if (city) {
    query = query.ilike('city', city);
  }
  if (rating) {
    query = query.gte('rating', rating);
  }

  const from = (page - 1) * perPage;
  const { data: listings, count } = await query
    .order('featured', { ascending: false })
    .order('rating', { ascending: false })
    .range(from, from + perPage - 1);

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <SearchBar defaultValue={q} />
      </div>

      {q && (
        <p className="text-sm text-gray-500 mb-4">
          {count || 0} results{q ? ` for "${q}"` : ''}
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <Suspense fallback={<div className="w-64" />}>
          <FilterSidebar categories={categories || []} />
        </Suspense>

        <div className="flex-1">
          {/* Map */}
          {listings && listings.length > 0 && (
            <div className="h-64 mb-6 rounded-xl overflow-hidden border border-gray-200">
              <MapViewWrapper listings={listings as unknown as Listing[]} />
            </div>
          )}

          {/* Results */}
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing as unknown as Listing & { categories: { name: string; slug: string; icon: string } }} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const newParams = new URLSearchParams();
                if (q) newParams.set('q', q);
                if (category) newParams.set('category', category);
                if (city) newParams.set('city', city);
                if (rating) newParams.set('rating', String(rating));
                newParams.set('page', String(p));
                return (
                  <a
                    key={p}
                    href={`/search?${newParams.toString()}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-blue-800 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
