import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const secret = () => (process.env.UNSUBSCRIBE_SECRET || '').trim();
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function signUnsub(email: string): string {
  const e = email.trim().toLowerCase();
  const sig = crypto.createHmac('sha256', secret()).update(e).digest('base64url').slice(0, 32);
  return `${b64u(e)}.${sig}`;
}

export function verifyUnsub(token: string | null | undefined): string | null {
  if (!token || !secret()) return null;
  const [p, sig] = token.split('.');
  if (!p || !sig) return null;
  let email: string;
  try { email = Buffer.from(p, 'base64url').toString('utf8'); } catch { return null; }
  const want = crypto.createHmac('sha256', secret()).update(email).digest('base64url').slice(0, 32);
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  return email;
}

/** Record a suppression in Supabase (primary) and the Resend "Suppression" audience (backup). */
export async function suppress(email: string, reason: string): Promise<{ supabase: boolean; resend: boolean }> {
  const e = email.trim().toLowerCase();
  let sb = false, rs = false;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim());
    const { error } = await supabase.from('email_suppression').upsert({ email: e, reason }, { onConflict: 'email', ignoreDuplicates: true });
    sb = !error;
    if (error) console.error('suppression supabase error', error.message);
  } catch (err) { console.error('suppression supabase exception', err); }
  const aud = (process.env.RESEND_SUPPRESSION_AUDIENCE_ID || '').trim();
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (aud && key) {
    try {
      const r = await fetch(`https://api.resend.com/audiences/${aud}/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, unsubscribed: true, first_name: reason.slice(0, 40) }),
      });
      rs = r.ok;
    } catch (err) { console.error('suppression resend exception', err); }
  }
  return { supabase: sb, resend: rs };
}
