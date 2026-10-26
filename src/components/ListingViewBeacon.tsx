'use client';
import { useEffect } from 'react';

/** Records one view per listing per visitor per day (localStorage dedupe). Bots are filtered again on the server. */
export default function ListingViewBeacon({ listingId }: { listingId: string }) {
  useEffect(() => {
    try {
      if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return;
      const day = new Date().toISOString().slice(0, 10);
      const key = `hapv:${listingId}:${day}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      const body = JSON.stringify({ id: listingId });
      if (!navigator.sendBeacon?.('/api/listing-view', new Blob([body], { type: 'application/json' }))) {
        fetch('/api/listing-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    } catch { /* never break the page */ }
  }, [listingId]);
  return null;
}
