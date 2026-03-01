'use client';

import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
}

export default function TurnstileWidget({ onSuccess, onError }: TurnstileWidgetProps) {
  return (
    <Turnstile
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
      onSuccess={onSuccess}
      onError={onError}
      options={{ theme: 'light', size: 'normal' }}
    />
  );
}
