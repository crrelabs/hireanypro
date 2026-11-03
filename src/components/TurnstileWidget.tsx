'use client';

import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC; s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile load failed')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/**
 * Cloudflare Turnstile, "interaction-only" so most visitors never see a challenge.
 * Without a site key it falls back to the old timing token (server accepts that only
 * while Turnstile is not configured server-side).
 */
export default function TurnstileWidget({ onSuccess, onError }: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onSuccess);
  const errCb = useRef(onError);
  useEffect(() => { cb.current = onSuccess; errCb.current = onError; });

  useEffect(() => {
    const start = Date.now();
    if (!SITE_KEY) {
      const t = setTimeout(() => cb.current(`auto_${Date.now() - start}_${Math.random().toString(36).slice(2)}`), 1000);
      return () => clearTimeout(t);
    }
    let id: string | null = null;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        callback: (token: string) => cb.current(token),
        'expired-callback': () => { cb.current(''); if (id && window.turnstile) window.turnstile.reset(id); },
        'error-callback': () => { errCb.current?.(); },
      });
    }).catch(() => errCb.current?.());
    return () => { cancelled = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, []);

  return <div ref={ref} className="my-2" />;
}
