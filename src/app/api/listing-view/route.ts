import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { adminClient } from '@/lib/listing-views';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|httpclient|monitor/i;

/** Counts one listing page view (the browser beacon dedupes to once per listing per visitor per day). */
export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
    if (isRateLimited(`view:${getClientIp(req)}`, 30)) return new NextResponse(null, { status: 204 });
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!UUID.test(id)) return new NextResponse(null, { status: 204 });
    const sb = adminClient();
    if (sb) await sb.rpc('increment_listing_view', { p_listing: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
