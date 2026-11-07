'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { onHuman, track } from '@/lib/track';

/** Secondary claim-success link. The view event waits for a human signal so scanners do not count. */
export default function BadgeClaimCta({ listingSlug }: { listingSlug?: string }) {
  const seen = useRef(false);
  useEffect(() => {
    return onHuman(() => {
      if (seen.current) return;
      seen.current = true;
      track('badge_claim_cta_view', listingSlug ? { listing_slug: listingSlug } : {});
    });
  }, [listingSlug]);

  return (
    <Link
      href="/dashboard?src=claim_success&cmp=badge_cta"
      onClick={() => track('badge_claim_cta_click', listingSlug ? { listing_slug: listingSlug } : {})}
      className="mt-3 block text-sm text-blue-800 hover:underline"
    >
      Add a HireAnyPro badge to your website →
    </Link>
  );
}
