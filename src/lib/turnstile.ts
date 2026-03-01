/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if valid, false otherwise.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    console.error('Turnstile verification failed');
    return false;
  }
}
