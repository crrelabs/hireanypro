import crypto from 'crypto';

/**
 * One-click claim links. We only put these in emails sent TO the address already on file for the listing,
 * so opening the link proves the same thing the verification email proves (control of that inbox).
 * The claim still needs a button click (POST), so link scanners that prefetch URLs can't claim anything.
 * Format: base64url(JSON {l: listingId, e: email, x: expiry}) + "." + base64url(HMAC-SHA256).
 * The same format is produced by the box outreach script (scripts/outreach_send.py, claim_token()).
 */
const DAYS = 30;
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

function key(): Buffer | null {
  const s = (process.env.CLAIM_LINK_SECRET || '').trim();
  return s ? crypto.createHash('sha256').update(`hap-claim-v1:${s}`).digest() : null;
}

export function signClaimLink(listingId: string, email: string): string | null {
  const k = key();
  if (!k) return null;
  const body = b64(JSON.stringify({ l: listingId, e: email.trim().toLowerCase(), x: Math.floor(Date.now() / 1000) + DAYS * 86400 }));
  return `${body}.${b64(crypto.createHmac('sha256', k).update(body).digest())}`;
}

export function verifyClaimLink(token: unknown): { listingId: string; email: string } | null {
  const k = key();
  if (!k || typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = b64(crypto.createHmac('sha256', k).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof p.l !== 'string' || typeof p.e !== 'string' || typeof p.x !== 'number' || p.x < Date.now() / 1000) return null;
    return { listingId: p.l, email: p.e };
  } catch {
    return null;
  }
}
