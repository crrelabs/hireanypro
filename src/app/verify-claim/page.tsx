'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

function VerifyClaimContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [reissued, setReissued] = useState(false);
  const [listingId, setListingId] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    fetch('/api/verify-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        const w = window as unknown as { gtag?: (...args: unknown[]) => void };
        if (data.success) {
          w.gtag?.('event', 'claim_verified', { page_path: '/verify-claim' });
          setStatus('success');
          setEmail(data.email || '');
          setListingId(data.listingId || '');
          setMessage('Your claim has been verified! You can now manage your listing.');
        } else {
          if (data.reissued) { w.gtag?.('event', 'claim_link_reissued', { page_path: '/verify-claim' }); setReissued(true); }
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong.');
      });
  }, [token]);

  return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center">
      {status === 'loading' && <p className="text-gray-600 text-lg">Verifying your claim...</p>}
      {status === 'success' && (
        <>
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Verified!</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/dashboard" className="inline-block bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors">
            Go to Dashboard →
          </Link>
          {listingId && (
            <div className="mt-10 text-left bg-white border-2 border-blue-800 rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-1">Optional upgrade</p>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Get every quote request in your inbox: Pro, $9/month</h2>
              <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc pl-5">
                <li>See the customer&apos;s name, phone and email on every request (free plans see a locked preview)</li>
                <li>Your phone, email and website shown on your listing</li>
                <li>Ranked above free listings in your category and city, plus a Verified badge</li>
              </ul>
              <Link href={`/pricing?plan=pro&listing=${encodeURIComponent(listingId)}&utm_source=verify_claim&utm_medium=web&utm_campaign=post_claim`}
                className="block text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors">
                Upgrade to Pro: $9/month
              </Link>
              <p className="text-xs text-gray-500 text-center mt-2">Cancel anytime. Your free listing stays free if you skip this.</p>
            </div>
          )}
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-6xl mb-4">{reissued ? '📧' : '❌'}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{reissued ? 'Check Your Email' : 'Verification Failed'}</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/claim" className="text-blue-800 hover:underline font-medium">
            Try claiming again →
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyClaimPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto py-20 px-4 text-center text-gray-500">Loading...</div>}>
      <VerifyClaimContent />
    </Suspense>
  );
}
