'use client';

import dynamic from 'next/dynamic';
import type { Listing } from '@/lib/supabase';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" /> });

export default function MapViewWrapper({ listings, center }: { listings: Listing[]; center?: [number, number] }) {
  return <MapView listings={listings} center={center} />;
}
