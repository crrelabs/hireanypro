import { createHash } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
/**
 * Simple in-memory rate limiter for Vercel serverless.
 * NOTE: This is per-instance and resets on cold starts.
 * For production, use Vercel KV or Upstash Redis.
 */

const hits = new Map<string, number[]>();

// Clean old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, times] of hits) {
    const filtered = times.filter((t) => t > cutoff);
    if (filtered.length === 0) hits.delete(key);
    else hits.set(key, filtered);
  }
}, 300_000);

/**
 * Check if a request should be rate-limited.
 * @param ip - Client IP address
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default 60s)
 * @returns true if rate-limited (should reject)
 */
export function isRateLimited(ip: string, maxRequests: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const key = ip;
  const times = hits.get(key) || [];
  const recent = times.filter((t) => t > now - windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > maxRequests;
}

/**
 * Get client IP from request headers (Vercel sets x-forwarded-for).
 */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// ---------------------------------------------------------------------------
// Durable limiter backed by Supabase (public.rate_limits + rate_limit_hit()).
// Shared across all serverless instances. Fails open on any Supabase error
// or timeout so a database problem never blocks real users.
// ---------------------------------------------------------------------------

let rlAdmin: SupabaseClient | null = null;
function rlClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return (rlAdmin ??= createClient(url, key, { auth: { persistSession: false } }));
}

export type DurableLimits = { perMinute?: number; perHour?: number };

/**
 * Returns true if this IP has exceeded the route's limits (default 10/min, 50/h).
 * Never throws; returns false (allow) if Supabase is unavailable or slow (>1.5s).
 */
export async function isRateLimitedDurable(
  req: Request,
  route: string,
  { perMinute = 10, perHour = 50 }: DurableLimits = {},
): Promise<boolean> {
  try {
    const sb = rlClient();
    if (!sb) return false;
    const ipHash = createHash('sha256').update(getClientIp(req)).digest('hex').slice(0, 32);
    const call = sb.rpc('rate_limit_hit', { p_key: `${route}:${ipHash}`, p_minute_limit: perMinute, p_hour_limit: perHour });
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 1500));
    const res = (await Promise.race([call, timeout])) as { data: unknown; error: unknown } | null;
    if (!res || res.error) return false;
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    return Boolean((row as { limited?: boolean } | null)?.limited);
  } catch {
    return false;
  }
}

/** Standard 429 response with Retry-After. */
export function tooManyRequests(message = 'Too many requests. Please try again later.'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
  });
}
