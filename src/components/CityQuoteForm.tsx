'use client';

import { useState } from 'react';
import TurnstileWidget from '@/components/TurnstileWidget';

/** "Get up to 3 free quotes" on category+city pages. The server picks which pros receive it. */
export default function CityQuoteForm({ categorySlug, categoryName, citySlug, cityName }: {
  categorySlug: string; categoryName: string; citySlug: string; cityName: string;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  const track = (name: string, p: Record<string, unknown> = {}) => {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.('event', name, { page_path: window.location.pathname, form: 'city_multi_quote', category: categorySlug, city: citySlug, ...p });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending'); setErr('');
    try {
      const res = await fetch('/api/quote-multi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, smsOptIn: smsOptIn && !!form.phone, categorySlug, citySlug, turnstileToken: token, website: honeypot }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        track('quote_submit', { pros: data.count });
        setPros(data.pros || []); setStatus('done');
      } else { setErr(data.error || 'Something went wrong.'); setStatus('error'); track('quote_error'); }
    } catch { setErr('Something went wrong. Please try again.'); setStatus('error'); }
  }

  const cat = categoryName.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' '); // keep acronyms ("HVAC")
  if (status === 'done') {
    return (
      <section id="get-quotes" className="mb-10 bg-green-50 border border-green-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-green-900">✅ Request sent{pros.length ? ` to ${pros.length} ${cat} ${pros.length === 1 ? 'pro' : 'pros'}` : ''}</h2>
        {pros.length > 0 && <p className="text-green-800 text-sm mt-1">{pros.join(', ')}</p>}
        <p className="text-green-800 text-sm mt-2">We emailed you a copy. We&apos;ll follow up if you don&apos;t hear back.</p>
      </section>
    );
  }

  const input = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none text-gray-900 bg-white';
  return (
    <section id="get-quotes" className="mb-10 rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
      <h2 className="text-xl font-bold text-gray-900">Get up to 3 free quotes from {cityName} {cat} pros</h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">Tell us what you need once. We send it to top-rated local pros. Free, no obligation.</p>
      <form onSubmit={submit} onFocus={() => { if (!started) { setStarted(true); track('quote_form_start'); } }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="hidden" aria-hidden="true">
          <label htmlFor="cq-website">Website</label>
          <input id="cq-website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>
        <textarea required rows={3} placeholder={`What do you need done? (e.g. job details, timing) *`} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })} className={`${input} md:col-span-2 resize-none`} aria-label="What do you need done" />
        <input required type="text" placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} aria-label="Your name" />
        <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} aria-label="Email" />
        <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} aria-label="Phone" />
        <label className="flex items-start gap-2 cursor-pointer md:col-span-2">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-1 w-4 h-4" />
          <span className="text-xs text-gray-600">
            Optional: text me about my quote request. I agree to receive SMS from HireAnyPro at the number above. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Consent is not required to submit. See our{' '}
            <a href="/sms-policy" className="text-blue-800 hover:underline">SMS Policy</a> and <a href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</a>.
          </span>
        </label>
        <TurnstileWidget onSuccess={setToken} />
        {err && <p className="text-red-600 text-sm md:col-span-2">{err}</p>}
        <button type="submit" disabled={status === 'sending'} className="md:col-span-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
          {status === 'sending' ? 'Sending…' : '📩 Get My Free Quotes'}
        </button>
      </form>
    </section>
  );
}
