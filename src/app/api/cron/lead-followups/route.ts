import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';
import { isSuppressed } from '@/lib/suppression';
import { leadTeaser } from '@/lib/lead-upsell';
import { smsEnabled, processRow } from '@/lib/sms-leads';

export const dynamic = 'force-dynamic';

/**
 * One reminder ~48h after a free listing got a lead-teaser email, only if it still hasn't upgraded.
 * Runs daily via Vercel Cron. Respects email_suppression / unsubscribe. Never re-sends.
 */
export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim());
  const now = Date.now();
  const { data: rows, error } = await supabase
    .from('inquiries')
    .select('id, created_at, listing_id, listings(id, name, slug, email, tier, claimed, city, categories(name))')
    .neq('status', 'internal')
    .not('upsell_sent_at', 'is', null)
    .is('upsell_followup_sent_at', null)
    .lte('upsell_sent_at', new Date(now - 44 * 3600e3).toISOString())
    .gte('upsell_sent_at', new Date(now - 7 * 86400e3).toISOString())
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0, skipped = 0;
  const mailedToday = new Set<string>();
  for (const r of rows || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = (r as any).listings as { id: string; name: string; slug: string; email: string | null; tier: string | null; claimed: boolean | null; city: string | null; categories: { name: string } | null } | null;
    const to = l?.email?.trim().toLowerCase();
    // Mark as handled first so a crash can never cause a double send.
    await supabase.from('inquiries').update({ upsell_followup_sent_at: new Date().toISOString() }).eq('id', r.id);
    if (!l || !to || l.tier === 'pro' || l.tier === 'featured' || mailedToday.has(to) || (await isSuppressed(to))) { skipped++; continue; }
    const ok = await sendMail(leadTeaser({ listing: l, cat: l.categories?.name || 'home service', city: l.city || 'your area', when: new Date(r.created_at), followUp: true }).mail(to));
    if (ok) { sent++; mailedToday.add(to); } else skipped++;
  }
  // SMS teasers waiting for business hours (only when SMS is switched on).
  let sms = 0;
  if (smsEnabled()) {
    const { data: q } = await supabase.from('sms_queue').select('id, to_phone, body').eq('status', 'queued').gte('created_at', new Date(now - 3 * 86400e3).toISOString()).limit(100);
    for (const r of q || []) { await processRow(supabase, r); sms++; }
  }
  return NextResponse.json({ checked: rows?.length || 0, sent, skipped, smsProcessed: sms });
}
