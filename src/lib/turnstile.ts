/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if valid, false otherwise.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  // Skip verification if no real key configured (test keys or empty)
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || secret.startsWith('1x000')) return true;
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
