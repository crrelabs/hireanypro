import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { sessionEmail, likeExact } from '@/lib/session';
import { recordSmsOptIn, toE164 } from '@/lib/sms-leads';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** Owner dashboard SMS lead-alert toggle. Opt-in is recorded exactly like the claim form (sms_queue status 'opt_in'). */
export async function POST(req: NextRequest) {
  if (isRateLimited(`dashboard-sms:${getClientIp(req)}`, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const email = sessionEmail(req);
    if (!email) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    if (!listingId) return NextResponse.json({ error: 'Missing listing.' }, { status: 400 });

    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', likeExact(email)).limit(1).maybeSingle();
    if (!profile) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    const { data: sub } = await supabase.from('subscriptions').select('listing_id')
      .eq('profile_id', profile.id).eq('listing_id', listingId).eq('status', 'active').limit(1).maybeSingle();
    if (!sub) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

    if (body.enable === true) {
      if (body.consent !== true) return NextResponse.json({ error: 'Please tick the consent box.' }, { status: 400 });
      const phone = toE164(typeof body.phone === 'string' ? body.phone : '');
      if (!phone) return NextResponse.json({ error: 'Enter a valid US mobile number.' }, { status: 400 });
      const ok = await recordSmsOptIn(supabase, { listingId, phone, source: 'dashboard' });
      if (!ok) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
      return NextResponse.json({ smsPhone: phone });
    }
    await supabase.from('sms_queue').update({ status: 'opt_out', reason: 'dashboard_opt_out' })
      .eq('listing_id', listingId).eq('status', 'opt_in');
    return NextResponse.json({ smsPhone: null });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
