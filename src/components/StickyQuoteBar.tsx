'use client';

import { useEffect, useState } from 'react';
import { isAutomatedBrowser } from '@/lib/track';

/**
 * Mobile-only bottom bar ("Get a free quote") on listing and city pages. On phones the quote form sits below the
 * business details / list, so most visitors never see it. Shown only while the form is off screen; tapping scrolls to
 * the form and focuses its first field. GA4: quote_cta_click {form, surface: 'sticky_bar'}.
 */
export default function StickyQuoteBar({ targetId, label, form }: { targetId: string; label: string; form: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // Only after a little scrolling (never covers the first screen), and only while the form is off screen.
      setShow(window.scrollY > 200 && (r.bottom < 0 || r.top > window.innerHeight));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    check();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [targetId]);

  if (!show) return null;
  const go = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    // Offset for the sticky site header so the form heading stays visible.
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    setTimeout(() => (el.querySelector('textarea, input:not([type=hidden]):not([tabindex="-1"])') as HTMLElement | null)?.focus({ preventScroll: true }), 600);
    if (!isAutomatedBrowser()) {
      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'quote_cta_click', { page_path: window.location.pathname, form, surface: 'sticky_bar' });
    }
  };
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <button type="button" onClick={go} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg text-sm">
        📩 {label}
      </button>
    </div>
  );
}
