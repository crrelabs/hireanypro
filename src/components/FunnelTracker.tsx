'use client';
import { useEffect } from 'react';
import { isAutomatedBrowser } from '@/lib/track';

// Fires GA4 events for the money clicks so the claim → paid funnel is measurable.
export default function FunnelTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isAutomatedBrowser()) return; // email scanners and headless crawlers
      const a = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      let name: string | null = null;
      if (href.startsWith('/claim')) name = 'claim_click';
      else if (href.startsWith('/pricing')) name = 'pricing_click';
      else if (href.startsWith('tel:')) name = 'phone_click';
      else if (href.startsWith('mailto:')) name = 'email_click';
      else if (href.includes('checkout.stripe.com') || href.includes('buy.stripe.com')) name = 'checkout_click';
      if (!name) return;
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      // Never send the signed one-click token (ct) to analytics.
      w.gtag?.('event', name, { link_url: href.replace(/([?&])ct=[^&#]*&?/, '$1').replace(/[?&]$/, ''), page_path: window.location.pathname });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
