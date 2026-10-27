import { NextRequest } from 'next/server';
import { badgeSvg } from '@/lib/badge';

const SVG = badgeSvg();

// Serves the "Find us on HireAnyPro" badge image and logs which site displayed it
// (grep Vercel logs for "badge_view"; scripts/badge_check.py on the box checks owner sites directly).
// Not CDN-cached on purpose so every display reaches the function; browsers cache it for a day.
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const clean = /^[a-z0-9-]{1,120}$/.test(slug) ? slug : 'invalid';
  let host = '';
  try { host = new URL(req.headers.get('referer') || '').hostname.replace(/^www\./, ''); } catch { /* no referer */ }
  if (host && !/(^|\.)hireanypro\.com$/.test(host) && host !== 'localhost') {
    console.log(JSON.stringify({ evt: 'badge_view', slug: clean, host }));
  }
  return new Response(SVG, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
