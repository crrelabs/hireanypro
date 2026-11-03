/**
 * Server-side bot check for public forms (quote, quote-multi, review, claim).
 *
 * Real Cloudflare Turnstile tokens are verified with siteverify using TURNSTILE_SECRET_KEY.
 * Empty tokens are always rejected. The old client-built timing tokens ("human_<ms>_…",
 * "auto_<ms>_…") are only accepted while Turnstile is not usable on the server (secret
 * missing, or Cloudflare reports the secret invalid), so a config problem degrades to the
 * previous timing check instead of breaking every form. That fallback is logged loudly.
 */
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMING = /^(human|auto)_(\d+)_[a-z0-9]*$/;

let secretBroken = false; // set when Cloudflare says the secret is invalid (per instance)

function timingCheck(token: string): boolean {
  const m = token.match(TIMING);
  if (!m) return false;
  const elapsed = parseInt(m[2], 10);
  if (elapsed < 200) {
    console.warn(`Bot check: form submitted in ${elapsed}ms`);
    return false;
  }
  return true;
}

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;

  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim();
  const isTiming = TIMING.test(token);

  if (!secret || secretBroken) {
    console.error('Turnstile not enforced: TURNSTILE_SECRET_KEY missing or invalid; using timing fallback');
    return timingCheck(token);
  }
  // Turnstile is enforced: timing tokens are trivially forgeable, so they are not accepted.
  if (isTiming) return false;

  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') form.set('remoteip', ip);
    const res = await fetch(SITEVERIFY, { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success) return true;
    const codes = data['error-codes'] || [];
    if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
      secretBroken = true;
      console.error('Turnstile secret rejected by Cloudflare; falling back to timing check');
      return false;
    }
    console.warn('Turnstile verification failed:', codes.join(','));
    return false;
  } catch (e) {
    // Cloudflare unreachable: fail open so real customers are not blocked; honeypot + rate limit still apply.
    console.error('Turnstile siteverify error (allowing):', e);
    return true;
  }
}
