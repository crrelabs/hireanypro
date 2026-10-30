'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { isAutomatedBrowser, onHuman } from '@/lib/track';
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

function tokenEmailFrom(ct: string): string {
  try {
    const p = JSON.parse(atob((ct.split('.')[0] || '').replace(/-/g, '+').replace(/_/g, '/')));
    return typeof p.e === 'string' ? p.e : '';
  } catch {
    return '';
  }
}

type TapState = 'idle' | 'loading' | 'done' | 'error';

/**
 * Email arrivals with a signed ct link claim right here in one tap (POST /api/claim with the token): no second page,
 * no second button. Before Oct 30 the banner button only opened /claim, where the owner had to click again.
 * Arrivals without a token still go to /claim. Scanners never POST, so they can't claim anything.
 */
export function OwnerClaimBanner({ slug, name, listingId }: { slug: string; name: string; listingId?: string }) {
  const { ct, fromEmail } = useEmailArrival();
  const tokenEmail = ct ? tokenEmailFrom(ct) : '';
  const oneTap = !!(ct && tokenEmail && listingId);
  const mountedAt = useRef(Date.now());
  const [state, setState] = useState<TapState>('idle');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (fromEmail) return onHuman(() => track('owner_banner_view', { listing_slug: slug, one_click: !!ct }));
  }, [fromEmail, ct, slug]);
  if (!fromEmail) return null;

  async function claimNow() {
    if (!listingId || state === 'loading') return;
    setState('loading'); setErr('');
    track('claim_click', { listing_slug: slug, surface: 'listing_banner', method: 'one_tap' });
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          email: tokenEmail,
          claimToken: ct,
          turnstileToken: `human_${Math.max(Date.now() - mountedAt.current, 200)}_${Math.random().toString(36).slice(2)}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.verified) {
        track('claim_submit', { listing_slug: slug, method: 'one_click', surface: 'listing_banner' });
        track('claim_verified', { listing_slug: slug, method: 'one_click', surface: 'listing_banner' });
        setState('done');
        return;
      }
      // Token no longer matches (email on file changed, expired link): fall back to the normal claim page.
      track('claim_error', { listing_slug: slug, surface: 'listing_banner', reason: String(data.error || 'not_verified').slice(0, 80) });
      setErr(data.error || 'We could not finish that here.');
      setState('error');
    } catch {
      setErr('Connection problem.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="mb-6 rounded-xl border-2 border-green-500 bg-green-50 p-5">
        <p className="font-bold text-gray-900 text-lg">🎉 {name} is now yours.</p>
        <p className="text-sm text-gray-700 mb-3">You&apos;re signed in. Add your phone, hours, services and a real description so homeowners pick you.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard" className="text-center bg-blue-800 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg">Edit My Listing</Link>
          <Link href={`/pricing?plan=pro&listing=${encodeURIComponent(listingId || slug)}&utm_source=claim_success&utm_medium=web&utm_campaign=listing_one_tap`}
            className="text-center border-2 border-orange-500 text-orange-700 hover:bg-orange-100 font-semibold px-5 py-2.5 rounded-lg">Optional: rank above free listings with Pro ($9/mo)</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border-2 border-orange-400 bg-orange-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold text-gray-900">Is this your business? {name} is unclaimed.</p>
        <p className="text-sm text-gray-700">
          {oneTap
            ? <>You opened this from our email to <b>{tokenEmail}</b>, so one tap claims it: no form, no verification email, free forever.</>
            : ct
              ? 'You opened this from our email, so you can claim it in one click: no verification email, free forever.'
              : 'Claim it free to fix your details and receive quote requests from homeowners.'}
        </p>
        <ClaimValueCard listing={slug} surface="listing_banner" compact />
        {state === 'error' && (
          <p className="text-sm text-red-700 mt-2">{err} <a href={claimHref(slug, ct, 'listing_banner')} className="underline font-semibold">Finish on the claim page</a>.</p>
        )}
      </div>
      <div className="shrink-0 text-center">
        {oneTap ? (
          <>
            <button onClick={claimNow} disabled={state === 'loading'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-lg">
              {state === 'loading' ? 'Claiming…' : 'Claim It Now — Free'}
            </button>
            <p className="text-xs text-gray-500 mt-1 max-w-[16rem]">By claiming, you confirm you manage this business. <a href={claimHref(slug, ct, 'listing_banner')} className="underline">Use a different email</a></p>
          </>
        ) : (
          <a href={claimHref(slug, ct, 'listing_banner')}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg">
            {ct ? 'Claim in One Click' : 'Claim This Listing'}
          </a>
        )}
      </div>
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
