import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Signed, stateless owner sessions for the business dashboard.
 * Before this, /api/dashboard and /api/listing/update trusted whatever email the browser sent,
 * so anyone who knew an owner's (often public) email could read their leads or edit their listing.
 */
export const SESSION_COOKIE = 'hap_session';
const SESSION_DAYS = 30;
const LOGIN_LINK_HOURS = 24;

type Purpose = 'login' | 'session';

function key(): Buffer {
  const base = process.env.HAP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base) throw new Error('No session secret configured');
  return crypto.createHash('sha256').update(`hap-session-v1:${base}`).digest();
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function signToken(email: string, purpose: Purpose): string {
  const ttl = purpose === 'login' ? LOGIN_LINK_HOURS * 3600 : SESSION_DAYS * 86400;
  const body = b64(JSON.stringify({ e: email.trim().toLowerCase(), p: purpose, x: Math.floor(Date.now() / 1000) + ttl }));
  const sig = b64(crypto.createHmac('sha256', key()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null, purpose: Purpose): string | null {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64(crypto.createHmac('sha256', key()).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.p !== purpose || typeof p.e !== 'string' || typeof p.x !== 'number') return null;
    if (p.x < Date.now() / 1000) return null;
    return p.e;
  } catch {
    return null;
  }
}

export function sessionEmail(req: NextRequest): string | null {
  return verifyToken(req.cookies.get(SESSION_COOKIE)?.value, 'session');
}

export function setSessionCookie(res: NextResponse, email: string) {
  res.cookies.set(SESSION_COOKIE, signToken(email, 'session'), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

/** Escape LIKE wildcards so .ilike() does an exact, case-insensitive email match. */
export const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
