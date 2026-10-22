import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const FROM = (process.env.RESEND_FROM_EMAIL || 'HireAnyPro <iris@hireanypro.com>').trim();
const REPLY_TO = 'iris@hireanypro.com';

/** Transactional mail: Resend (hireanypro.com is verified) first, Gmail SMTP as fallback. */
export async function sendMail(opts: { to: string; subject: string; html?: string; text?: string }): Promise<boolean> {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (key) {
    try {
      const resend = new Resend(key);
      const { error } = await resend.emails.send({
        from: FROM, to: [opts.to], replyTo: REPLY_TO, subject: opts.subject,
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
