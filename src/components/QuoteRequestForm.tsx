'use client';

import { useState } from 'react';
import TurnstileWidget from '@/components/TurnstileWidget';

interface QuoteRequestFormProps {
  listingId: string;
  businessName: string;
  tier?: string;
  businessEmail?: string | null;
}

export default function QuoteRequestForm({ listingId, businessName, tier = 'free', businessEmail }: QuoteRequestFormProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isPaid = tier === 'pro' || tier === 'featured';
  const routedTo = isPaid && businessEmail ? businessEmail : 'iris@hireanypro.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!turnstileToken) {
      setErrorMsg('Please complete the CAPTCHA.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
          routedTo,
          turnstileToken,
          website: honeypot, // honeypot field
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', message: '' });
      } else {
        setErrorMsg(data.error || 'Something went wrong.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <span className="text-3xl mb-2 block">✅</span>
        <h3 className="font-semibold text-green-800 text-lg">Quote Request Sent!</h3>
        <p className="text-green-700 text-sm mt-1">
          {isPaid ? `${businessName} will get back to you soon.` : 'Your request has been forwarded. We\'ll connect you with this business shortly.'}
        </p>
        <button onClick={() => setStatus('idle')} className="mt-4 text-sm text-blue-800 hover:underline">
          Send another request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 text-lg mb-1">Get a Free Quote from {businessName}</h2>
      <p className="text-gray-500 text-sm mb-4">
        {isPaid
          ? `Your request goes directly to ${businessName}`
          : 'Your request will be forwarded to this business'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Honeypot - hidden from humans */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <input
          type="text" placeholder="Your Name *" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none"
        />
        <input
          type="email" placeholder="Email Address *" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none"
        />
        <input
          type="tel" placeholder="Phone (optional)" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none"
        />
        <textarea
          placeholder="Describe the work you need done *" required rows={4} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none resize-none"
        />

        <TurnstileWidget onSuccess={setTurnstileToken} />

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
        <button
          type="submit" disabled={status === 'submitting'}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {status === 'submitting' ? 'Sending...' : '📩 Request a Free Quote'}
        </button>
      </form>
    </div>
  );
}
