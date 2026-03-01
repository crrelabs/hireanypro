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
