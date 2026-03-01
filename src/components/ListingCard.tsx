import Link from 'next/link';
import Image from 'next/image';
import StarRating from './StarRating';
import { Listing } from '@/lib/supabase';

export default function ListingCard({ listing }: { listing: Listing & { categories?: { name: string; slug: string; icon: string } } }) {
  const isPaid = listing.tier === 'pro' || listing.tier === 'featured';
  const isFeatured = listing.tier === 'featured' || listing.featured;
  const categorySlug = listing.categories?.slug || 'general-contractor';
  const photoUrl = `/categories/${categorySlug}.png`;

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className={`group block bg-white rounded-xl border hover:shadow-lg transition-all duration-200 overflow-hidden ${
        isFeatured
          ? 'border-l-4 border-l-orange-400 border-t-gray-200 border-r-gray-200 border-b-gray-200'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="h-40 relative overflow-hidden">
        <Image src={photoUrl} alt={`${listing.name} - ${listing.categories?.name || 'Service Provider'} in ${listing.city}, FL`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 33vw" loading="lazy" />
        {isFeatured && (
          <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full z-10">
            ⭐ Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-800 transition-colors line-clamp-1">
            {listing.name}
          </h3>
          {isPaid && (
            <span className="text-green-600 text-xs flex-shrink-0" title="Verified Business">✅</span>
          )}
        </div>
        {listing.categories && (
          <p className="text-xs text-orange-600 font-medium mt-1">{listing.categories.name}</p>
        )}
        {listing.rating ? (
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={listing.rating} />
            <span className="text-sm text-gray-600">{listing.rating}</span>
            {listing.review_count > 0 && (
              <span className="text-xs text-gray-400">({listing.review_count})</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-2">New listing</p>
        )}
        {isPaid && listing.phone && (
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {listing.phone}
          </p>
        )}
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
