import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const FROM = (process.env.RESEND_FROM_EMAIL || 'HireAnyPro <iris@hireanypro.com>').trim();
const REPLY_TO = 'iris@hireanypro.com';

/** Append utm params to every https://hireanypro.com link (skips /api/ endpoints like unsubscribe and sign-in callbacks, and links that already carry utm_). */
export function tagLinks(body: string, campaign: string, medium = 'transactional'): string {
  const utm = `utm_source=email&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`;
  return body.replace(/https:\/\/(?:www\.)?hireanypro\.com(\/[^\s"'<>)]*)?/g, (m, path = '') => {
    if (/^\/api\//.test(path) || /[?&]utm_/.test(m)) return m;
    const trail = /[.,;:!]+$/.exec(m)?.[0] || '';
    const core = trail ? m.slice(0, -trail.length) : m;
    const hashAt = core.indexOf('#');
    const base = hashAt >= 0 ? core.slice(0, hashAt) : core;
    const hash = hashAt >= 0 ? core.slice(hashAt) : '';
    const sep = base.includes('?') ? (base.includes('&amp;') ? '&amp;' : '&') : (/^https:\/\/[^/]+$/.test(base) ? '/?' : '?');
    return base + sep + utm + hash + trail;
  });
}

/** Transactional mail: Resend (hireanypro.com is verified) first, Gmail SMTP as fallback. */
export async function sendMail(opts: { to: string; subject: string; html?: string; text?: string; replyTo?: string; headers?: Record<string, string>; campaign?: string }): Promise<boolean> {
  if (!/@hireanypro\.com$/i.test(opts.to.trim())) {
    const c = opts.campaign || 'transactional';
    opts = { ...opts, html: opts.html && tagLinks(opts.html, c), text: opts.text && tagLinks(opts.text, c) };
  }
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (key) {
    try {
      const resend = new Resend(key);
      const { error } = await resend.emails.send({
        from: FROM, to: [opts.to], replyTo: opts.replyTo || REPLY_TO, subject: opts.subject,
        ...(opts.headers ? { headers: opts.headers } : {}),
        ...(opts.html ? { html: opts.html } : {}), ...(opts.text ? { text: opts.text } : {}),
      } as Parameters<typeof resend.emails.send>[0]);
      if (!error) return true;
      console.error('Resend send failed:', error);
    } catch (e) { console.error('Resend exception:', e); }
  }
  const pass = (process.env.HIREANYPRO_APP_PASSWORD || '').trim();
  if (!pass) return false;
  try {
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: REPLY_TO, pass } });
    await t.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
    return true;
  } catch (e) { console.error('SMTP send failed:', e); return false; }
}
