'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
}

export default function TurnstileWidget({ onSuccess, onError }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const isTestKey = !siteKey || siteKey.startsWith('1x000');

  // Auto-pass when no real key configured
  useEffect(() => {
    if (isTestKey) onSuccess('skip');
  }, [isTestKey, onSuccess]);

  if (isTestKey) return null;

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onSuccess}
      onError={onError}
      options={{ theme: 'light', size: 'normal' }}
    />
  );
}
// force rebuild 1772377470
