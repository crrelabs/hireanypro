'use client';

import { useState } from 'react';
import { SMS_CONSENT_TEXT } from '@/lib/sms-consent-text';

export default function SmsToggle({ listingId, initialPhone }: { listingId: string; initialPhone: string | null }) {
  const [smsPhone, setSmsPhone] = useState<string | null>(initialPhone);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (enable: boolean) => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/dashboard/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId, enable, phone, consent }) });
      const j = await res.json();
      if (!res.ok) setErr(j.error || 'Something went wrong.');
      else { setSmsPhone(j.smsPhone); setConsent(false); }
    } catch { setErr('Something went wrong.'); }
    setBusy(false);
  };

  if (smsPhone) {
    return (
      <div className="mt-3 text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg p-3">
        📱 Text alerts are on for {smsPhone}.{' '}
        <button disabled={busy} onClick={() => save(false)} className="text-blue-800 hover:underline">Turn off</button>
        <span className="text-gray-500"> (or reply STOP to any alert)</span>
      </div>
    );
  }
  return (
    <div className="mt-3 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="font-semibold text-gray-900 mb-1">📱 Get new quote requests by text (optional)</p>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number, e.g. (305) 555-1234" className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg mb-2 text-gray-900" />
      <label className="flex items-start gap-2 cursor-pointer mb-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span className="text-xs text-gray-600">{SMS_CONSENT_TEXT} See our <a href="/terms#sms-terms" className="text-blue-800 hover:underline">SMS Terms</a> and <a href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</a>.</span>
      </label>
      <button disabled={busy || !consent || !phone} onClick={() => save(true)} className="bg-blue-800 text-white px-4 py-1.5 rounded-lg disabled:opacity-50">Turn on text alerts</button>
      {err && <p className="text-red-600 mt-2">{err}</p>}
    </div>
  );
}
