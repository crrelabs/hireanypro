'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
}

// Site key is public (rendered client-side) — safe to hardcode
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAACkd47GT7Drz4bsf';

export default function TurnstileWidget({ onSuccess, onError }: TurnstileWidgetProps) {
  return (
    <Turnstile
      siteKey={TURNSTILE_SITE_KEY}
      onSuccess={onSuccess}
      onError={onError}
      options={{ theme: 'light', size: 'normal' }}
    />
  );
}
