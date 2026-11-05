'use client';

import { useEffect, useRef } from 'react';
import { isAutomatedBrowser, onHuman } from '@/lib/track';
import { socialProofParts, type SocialProofStats } from '@/lib/social-proof-copy';

/**
 * Compact live counts. Renders nothing when every stat is missing.
 * social_proof_view fires once a person interacts (same gate as pricing_view and claim_value_view),
 * not on page load and not from headless browsers.
 */
export default function SocialProofStrip({
  surface,
  stats,
  className = 'mt-5',
}: {
  surface: 'pricing' | 'claim';
  stats: SocialProofStats;
  className?: string;
}) {
  const parts = socialProofParts(stats);
  const line = parts.join(' · ');
  const tracked = useRef(false);

  useEffect(() => {
    if (!line || isAutomatedBrowser()) return;
    return onHuman(() => {
      if (tracked.current) return;
      tracked.current = true;
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      w.gtag?.('event', 'social_proof_view', { surface, page_path: window.location.pathname });
    });
  }, [line, surface]);

  if (!line) return null;
  return (
    <p className={`mx-auto max-w-xl rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm text-gray-700 ${className}`}>
      {line}
    </p>
  );
}
