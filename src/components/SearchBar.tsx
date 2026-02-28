'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar({ defaultValue = '', large = false }: { defaultValue?: string; large?: boolean }) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`relative flex items-center ${large ? 'max-w-2xl' : 'max-w-xl'} mx-auto`}>
        <svg className="absolute left-4 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for plumbers, electricians, roofers..."
          className={`w-full pl-12 pr-28 ${large ? 'py-4 text-lg' : 'py-3 text-base'} border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white text-gray-900 placeholder-gray-400`}
        />
        <button
          type="submit"
          className={`absolute right-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold ${large ? 'px-6 py-2.5' : 'px-5 py-2'} rounded-lg transition-colors text-sm`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
