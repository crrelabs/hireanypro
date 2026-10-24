import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * HireAnyPro Alerts: transactional new-quote-request texts, ONLY to phone numbers with a recorded SMS opt-in.
 * Opt-in is recorded when a business owner ticks the optional SMS box on /claim (stored as an sms_queue row
 * with status 'opt_in', listing_id, to_phone and the consent text in body). No prices, upgrade pitches or
 * marketing are ever sent by SMS (A2P campaign is ACCOUNT_NOTIFICATION).
 * OFF unless SMS_LEADS_ENABLED=true. While off, rows are stored as 'held'.
 * SMS_DRY_RUN=true logs instead of calling Twilio. Never sends to opted-out numbers, outside 9am-8pm ET
 * (inside 8am-9pm for both FL time zones), or more than once per number per 24h.
 */
const SITE = 'https://hireanypro.com';
const FROM = (process.env.TWILIO_FROM_NUMBER || '+17866996091').trim();
// Send through the A2P-registered "HireAnyPro Alerts" messaging service (CRRE Labs LLC brand).
const MSG_SERVICE = (process.env.TWILIO_MESSAGING_SERVICE_SID || 'MG42086a25a6170a50889083e0ff5e5409').trim();
export const SMS_CONSENT_TEXT = '(Optional) I consent to receive SMS text messages from HireAnyPro Alerts (CRRE Labs LLC) at the phone number provided above, including new lead notifications, quote request updates, and account updates. No marketing or promotional texts are sent. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.';
export const smsEnabled = () => (process.env.SMS_LEADS_ENABLED || '').trim().toLowerCase() === 'true';
const dryRun = () => (process.env.SMS_DRY_RUN || '').trim().toLowerCase() === 'true';

export function toE164(raw: string | null | undefined): string | null {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return null;
}

export function inQuietSafeWindow(now = new Date()): boolean {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(now));
  return h >= 9 && h < 20;
}

/** Transactional alert text (matches the approved campaign sample). No price, no upgrade pitch. */
export function teaserBody(o: { name: string; cat: string; city: string }): string {
  const name = String(o.name || 'your business').slice(0, 60);
  return `HireAnyPro Alerts: new quote request for ${name} from a homeowner in ${o.city} (${o.cat.toLowerCase()}). ` +
    `View it in your dashboard: ${SITE}/dashboard Reply STOP to opt out, HELP for help.`;
}

/** Record SMS consent given on the claim form. */
export async function recordSmsOptIn(sb: SupabaseClient, o: { listingId: string; phone: string; source: string }): Promise<boolean> {
  const to = toE164(o.phone);
  if (!to) return false;
  const { error } = await sb.from('sms_queue').insert({ listing_id: o.listingId, to_phone: to, body: `[consent:${o.source}] ${SMS_CONSENT_TEXT}`, status: 'opt_in', reason: 'sms_opt_in' });
  return !error;
}

/** Latest opted-in phone for a listing, or null when nobody at that business opted in to SMS. */
export async function optedInPhone(sb: SupabaseClient, listingId: string): Promise<string | null> {
  const { data } = await sb.from('sms_queue').select('to_phone').eq('listing_id', listingId).eq('status', 'opt_in').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.to_phone || null;
}

async function hasOptIn(sb: SupabaseClient, phone: string): Promise<boolean> {
  const { count } = await sb.from('sms_queue').select('id', { count: 'exact', head: true }).eq('to_phone', phone).eq('status', 'opt_in');
  return (count || 0) > 0;
}

const auth = () => {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const tok = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  return sid && tok ? { sid, header: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64') } : null;
};

async function isMobile(phone: string): Promise<boolean | null> {
  const a = auth();
  if (!a) return null;
  try {
    const r = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence`, { headers: { Authorization: a.header } });
    if (!r.ok) return null;
    const j = await r.json();
    const t = j?.line_type_intelligence?.type as string | undefined;
    return t ? t === 'mobile' : null;
  } catch { return null; }
}

/** Store a teaser for this lead, and send it now only if every safety check passes. Returns the stored status. */
export async function queueLeadSms(sb: SupabaseClient, o: { inquiryId?: string; listingId: string; phone: string; body: string }): Promise<string> {
  const to = toE164(o.phone);
  if (!to) return 'no_valid_phone';
  const { data: row } = await sb.from('sms_queue').insert({ inquiry_id: o.inquiryId || null, listing_id: o.listingId, to_phone: to, body: o.body, status: smsEnabled() ? 'queued' : 'held' }).select('id').single();
  if (!smsEnabled() || !row) return 'held';
  return processRow(sb, { id: row.id, to_phone: to, body: o.body });
}

export async function processRow(sb: SupabaseClient, r: { id: string; to_phone: string; body: string }): Promise<string> {
  const set = (status: string, extra: Record<string, unknown> = {}) => sb.from('sms_queue').update({ status, ...extra }).eq('id', r.id).then(() => status);
  if (!(await hasOptIn(sb, r.to_phone))) return set('skipped', { reason: 'no_sms_opt_in' });
  const { data: opt } = await sb.from('sms_optout').select('phone').eq('phone', r.to_phone).maybeSingle();
  if (opt) return set('skipped', { reason: 'opted_out' });
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count } = await sb.from('sms_queue').select('id', { count: 'exact', head: true }).eq('to_phone', r.to_phone).in('status', ['sent', 'dry_run']).gte('sent_at', since);
  if ((count || 0) > 0) return set('skipped', { reason: '24h_cap' });
  if (!inQuietSafeWindow()) return 'queued'; // the daily cron picks it up in hours
  if (dryRun()) { console.log('[sms dry-run]', r.to_phone.slice(0, -4) + '****', r.body); return set('dry_run', { sent_at: new Date().toISOString() }); }
  const a = auth();
  if (!a) return set('failed', { reason: 'twilio_not_configured' });
  if ((await isMobile(r.to_phone)) === false) return set('skipped', { reason: 'not_mobile' });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${a.sid}/Messages.json`, {
    method: 'POST', headers: { Authorization: a.header, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(MSG_SERVICE ? { To: r.to_phone, MessagingServiceSid: MSG_SERVICE, Body: r.body } : { To: r.to_phone, From: FROM, Body: r.body }).toString(),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok ? set('sent', { sent_at: new Date().toISOString(), twilio_sid: j.sid }) : set('failed', { reason: String(j.code || res.status) });
}

/** Twilio webhook signature check (X-Twilio-Signature). */
export function validTwilioSignature(url: string, params: Record<string, string>, sig: string | null): boolean {
  const tok = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  if (!tok || !sig) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const want = crypto.createHmac('sha1', tok).update(data).digest('base64');
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}
