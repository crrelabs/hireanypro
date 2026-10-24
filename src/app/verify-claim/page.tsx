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
          <Link href={email ? `/dashboard?email=${encodeURIComponent(email)}` : '/dashboard'} className="inline-block bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors">
            Go to Dashboard →
          </Link>
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
