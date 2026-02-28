'use client';

import { useEffect, useRef } from 'react';
import type { Listing } from '@/lib/supabase';

// Dynamic import for Leaflet to avoid SSR issues
export default function MapView({ listings, center }: { listings: Listing[]; center?: [number, number] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    // Dynamic import
    import('leaflet').then((L) => {
      // Fix default markers
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (mapInstance.current) {
        (mapInstance.current as L.Map).remove();
      }

      const defaultCenter = center || [25.7617, -80.1918];
      const map = L.map(mapRef.current!, { scrollWheelZoom: false }).setView(defaultCenter, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      listings.forEach((listing) => {
        if (listing.lat && listing.lng) {
          L.marker([listing.lat, listing.lng])
            .addTo(map)
            .bindPopup(`<strong>${listing.name}</strong><br>${listing.city}, ${listing.state}`);
        }
      });

      if (listings.length > 0) {
        const validListings = listings.filter(l => l.lat && l.lng);
        if (validListings.length > 0) {
          const bounds = L.latLngBounds(validListings.map(l => [l.lat, l.lng]));
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
      }
    };
  }, [listings, center]);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} className="w-full h-full min-h-[300px] rounded-xl z-0" />
    </>
  );
}
