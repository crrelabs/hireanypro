import Link from 'next/link';
import StarRating from './StarRating';
import { Listing } from '@/lib/supabase';

export default function ListingCard({ listing }: { listing: Listing & { categories?: { name: string; slug: string; icon: string } } }) {
  return (
    <Link href={`/listing/${listing.slug}`} className="group block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center relative">
        <span className="text-5xl">{listing.categories?.icon || '🏠'}</span>
        {listing.featured && (
          <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-800 transition-colors line-clamp-1">
          {listing.name}
        </h3>
        {listing.categories && (
          <p className="text-xs text-orange-600 font-medium mt-1">{listing.categories.name}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <StarRating rating={listing.rating} />
          <span className="text-sm text-gray-600">{listing.rating}</span>
          <span className="text-xs text-gray-400">({listing.review_count})</span>
        </div>
        <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {listing.city}, {listing.state} {listing.zip}
        </p>
      </div>
    </Link>
  );
}
