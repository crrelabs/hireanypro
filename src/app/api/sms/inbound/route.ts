import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toE164, validTwilioSignature } from '@/lib/sms-leads';

const STOP = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'optout', 'revoke']);
const START = new Set(['start', 'unstop', 'yes']);

/** Twilio inbound SMS webhook: records STOP opt-outs (and START opt-ins). Twilio itself also blocks sends after STOP. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => { params[k] = String(v); });
  if (!validTwilioSignature('https://hireanypro.com/api/sms/inbound', params, req.headers.get('x-twilio-signature'))) {
    return new NextResponse('forbidden', { status: 403 });
  }
  const from = toE164(params.From);
  const word = (params.Body || '').trim().toLowerCase();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim());
  if (from && STOP.has(word)) await sb.from('sms_optout').upsert({ phone: from, source: 'sms_stop' });
  if (from && START.has(word)) await sb.from('sms_optout').delete().eq('phone', from);
  return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
}
