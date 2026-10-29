'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { isAutomatedBrowser } from '@/lib/track';
import ClaimValueCard from '@/components/ClaimValueCard';

/**
 * Owners who open their listing from one of our claim emails arrive with ?ct=<signed token> (and utm_medium=outreach).
 * Before this, the claim button on the listing page dropped the token, so they fell back to the slower
 * verification-email flow. These helpers keep the token and put a clear "this is your listing" prompt on top.
 * The page itself stays static (ISR); we only read the query string in the browser. Clicks are counted as claim_click by FunnelTracker.
 */
const noopSubscribe = () => () => {};
function useEmailArrival() {
  // Server render (and hydration) see '' so the static HTML never differs; the browser then reads the real query.
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => '');
  const p = new URLSearchParams(search);
  const ct = p.get('ct') || '';
  const fromEmail = !!ct || (p.get('utm_source') === 'email' && p.get('utm_medium') === 'outreach');
  return { ct, fromEmail };
}

function claimHref(slug: string, ct: string, source: string) {
  return `/claim?listing=${encodeURIComponent(slug)}&utm_source=${source}&utm_medium=web${ct ? `&ct=${encodeURIComponent(ct)}` : ''}`;
}

function track(name: string, params: Record<string, unknown>) {
  if (isAutomatedBrowser()) return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.('event', name, { page_path: window.location.pathname, ...params });
}

export function OwnerClaimBanner({ slug, name }: { slug: string; name: string }) {
  const { ct, fromEmail } = useEmailArrival();
  useEffect(() => {
    if (fromEmail) track('owner_banner_view', { listing_slug: slug, one_click: !!ct });
  }, [fromEmail, ct, slug]);
  if (!fromEmail) return null;
  return (
    <div className="mb-6 rounded-xl border-2 border-orange-400 bg-orange-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold text-gray-900">Is this your business? {name} is unclaimed.</p>
        <p className="text-sm text-gray-700">
          {ct
            ? 'You opened this from our email, so you can claim it in one click: no verification email, free forever.'
            : 'Claim it free to fix your details and receive quote requests from homeowners.'}
        </p>
        <ClaimValueCard listing={slug} surface="listing_banner" compact />
      </div>
      <a href={claimHref(slug, ct, 'listing_banner')}
        className="shrink-0 text-center bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg">
        {ct ? 'Claim in One Click' : 'Claim This Listing'}
      </a>
    </div>
  );
}

export function ClaimLink({ slug, className, children }: { slug: string; className: string; children: React.ReactNode }) {
  const { ct } = useEmailArrival();
  return (
    <a href={claimHref(slug, ct, 'listing_page')} className={className}>
      {children}
    </a>
  );
}
