'use client';

import { useState, useEffect, useMemo } from 'react';
import ListingCard from './ListingCard';
import { Listing } from '@/lib/supabase';

type ListingWithCategory = Listing & { categories?: { name: string; slug: string; icon: string } };

interface Props {
  listings: ListingWithCategory[];
  cities: string[];
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CategoryFilters({ listings, cities }: Props) {
  const [cityFilter, setCityFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [sortBy, setSortBy] = useState('reviews');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('');

  // Auto-detect location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setSortBy('distance');
          setLocationStatus('📍 Sorted by distance from you');
        },
        () => {
          setLocationStatus('');
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  const filtered = useMemo(() => {
    let result = [...listings];

    if (cityFilter) {
      result = result.filter((l) => l.city === cityFilter);
    }
    if (ratingFilter) {
      const min = parseFloat(ratingFilter);
      result = result.filter((l) => l.rating && l.rating >= min);
    }

    // Sort
    if (sortBy === 'distance' && userLat && userLng) {
      result.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const distA = a.lat && a.lng ? getDistanceKm(userLat, userLng, a.lat, a.lng) : 9999;
        const distB = b.lat && b.lng ? getDistanceKm(userLat, userLng, b.lat, b.lng) : 9999;
        return distA - distB;
      });
    } else if (sortBy === 'rating') {
      result.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    } else {
      // Default: reviews
      result.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (b.review_count || 0) - (a.review_count || 0);
      });
    }

    return result;
  }, [listings, cityFilter, ratingFilter, sortBy, userLat, userLng]);

  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [cityFilter, ratingFilter, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-800"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-800"
        >
          <option value="">Any Rating</option>
          <option value="4.5">4.5+ ⭐</option>
          <option value="4">4.0+ ⭐</option>
          <option value="3.5">3.5+ ⭐</option>
          <option value="3">3.0+ ⭐</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-800"
        >
          <option value="reviews">Most Reviews</option>
          <option value="rating">Highest Rated</option>
          {userLat && <option value="distance">Nearest to Me</option>}
        </select>

        <span className="text-sm text-gray-500">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {locationStatus && ` · ${locationStatus}`}
        </span>
      </div>

      {/* Results */}
      {visible.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-8 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Load More ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches</h3>
          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
          <button onClick={() => { setCityFilter(''); setRatingFilter(''); }} className="mt-3 text-blue-800 text-sm font-medium hover:underline">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
