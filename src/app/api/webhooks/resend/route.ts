import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { suppress } from '@/lib/suppression';

export const dynamic = 'force-dynamic';

// Resend webhooks are signed with Svix. Secret format: whsec_<base64>.
function verify(raw: string, id: string | null, ts: string | null, sigHeader: string | null): boolean {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret || !id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64');
  return sigHeader.split(' ').some((p) => {
    const s = p.split(',')[1];
    return s && s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected));
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get('svix-id'), req.headers.get('svix-timestamp'), req.headers.get('svix-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  const evt = JSON.parse(raw) as { type: string; data: { to?: string[]; bounce?: { type?: string } } };
  const to = evt.data?.to || [];
  let reason: string | null = null;
  if (evt.type === 'email.complained') reason = 'complaint';
  if (evt.type === 'email.bounced') {
    const bt = (evt.data?.bounce?.type || '').toLowerCase();
    reason = bt.includes('transient') || bt.includes('soft') ? null : 'bounce';
  }
  if (reason) for (const e of to) await suppress(e, reason);
  return NextResponse.json({ ok: true });
}
