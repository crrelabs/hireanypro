'use client';

import { useState } from 'react';
import { badgeSnippet } from '@/lib/badge';

/** "Find us on HireAnyPro" badge with copyable HTML for the owner's own website. */
export default function BadgeBox({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = badgeSnippet(slug, name);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-blue-800 hover:underline mt-2 block">
        🏅 Add a &ldquo;Find us on HireAnyPro&rdquo; badge to your website
      </button>
    );
  }
  return (
    <div className="mt-3 border border-blue-100 bg-blue-50 rounded-lg p-3 max-w-xl">
      <div className="text-sm text-gray-700 mb-2">Paste this code on your website (footer or reviews page). It shows the badge below and links visitors to your HireAnyPro listing, where they can read your reviews and request a quote.</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/badge/${slug}`} alt="Find us on HireAnyPro" width={200} height={56} className="mb-2" />
      <textarea readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} className="w-full text-xs font-mono p-2 border border-gray-300 rounded bg-white text-gray-800" />
      <div className="flex items-center gap-3 mt-2">
        <button onClick={copy} className="text-sm bg-blue-800 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">{copied ? 'Copied ✓' : 'Copy code'}</button>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">Hide</button>
      </div>
    </div>
  );
}
