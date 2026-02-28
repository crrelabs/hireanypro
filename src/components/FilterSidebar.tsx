'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Category } from '@/lib/supabase';

export default function FilterSidebar({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentRating = searchParams.get('rating') || '';
  const currentCity = searchParams.get('city') || '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  };

  const cities = ['Miami', 'Coral Gables', 'Doral', 'Hialeah', 'Kendall', 'Miami Gardens', 'Miami Lakes', 'North Miami Beach', 'Pinecrest', 'South Miami', 'Sunny Isles Beach', 'Aventura', 'Coconut Grove'];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Category</h3>
          <select
            value={currentCategory}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-3">City</h3>
          <select
            value={currentCity}
            onChange={(e) => updateFilter('city', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Minimum Rating</h3>
          <div className="space-y-2">
            {['4.5', '4.0', '3.5', '3.0'].map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={r}
                  checked={currentRating === r}
                  onChange={(e) => updateFilter('rating', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{r}+ stars</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                value=""
                checked={!currentRating}
                onChange={() => updateFilter('rating', '')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Any rating</span>
            </label>
          </div>
        </div>

        <button
          onClick={() => router.push('/search')}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
        >
          Clear all filters
        </button>
      </div>
    </aside>
  );
}
