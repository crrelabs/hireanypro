import { signUnsub } from '@/lib/suppression';
import { signClaimLink } from '@/lib/claim-link';

const SITE = 'https://hireanypro.com';
const TEAM_INBOX = 'iris@hireanypro.com';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export type TeaserListing = { id: string; name: string; slug: string; claimed: boolean | null };

/**
 * Upsell email for FREE listings (claimed or unclaimed) that get a lead.
 * Shows only service + city + date. Never includes the homeowner's name, email, phone or message.
 */
export function leadTeaser(o: { listing: TeaserListing; cat: string; city: string; when: Date; followUp: boolean; toEmail?: string }) {
  const { listing, cat, city, when, followUp } = o;
  // toEmail must be the address on file for the listing (that's who we email); it enables a one-click claim.
  const ct = !listing.claimed && o.toEmail ? signClaimLink(listing.id, o.toEmail) : null;
  const campaign = followUp ? 'lead_upsell_followup' : 'lead_upsell';
  const utm = `utm_source=lead_email&utm_medium=email&utm_campaign=${campaign}`;
  const upgrade = `${SITE}/pricing?plan=pro&listing=${encodeURIComponent(listing.id)}&${utm}`;
  const claim = `${SITE}/claim?listing=${encodeURIComponent(listing.slug)}&${utm}${ct ? `&ct=${encodeURIComponent(ct)}` : ''}`;
  const cta = listing.claimed
    ? { href: upgrade, label: 'Upgrade to Pro ($9/mo) to see this lead' }
    : { href: claim, label: 'Claim your free listing, then upgrade to see this lead' };
  const date = when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
  const steps = listing.claimed
    ? 'Pro is $9 a month. As soon as you upgrade, you get this customer\u2019s name, phone, email and full request, and every future lead goes straight to your inbox.'
    : 'Step 1: claim your listing (free, about two minutes). Step 2: upgrade to Pro for $9 a month to get this customer\u2019s name, phone, email and full request, plus every future lead in your inbox.';

  return {
    mail(to: string) {
      const unsub = `${SITE}/api/unsubscribe?t=${encodeURIComponent(signUnsub(to))}`;
      return {
        to,
        subject: followUp
          ? `Reminder: a ${cat.toLowerCase()} customer in ${city} is still waiting`
          : `New ${cat.toLowerCase()} lead in ${city} for ${listing.name}`,
        headers: {
          'List-Unsubscribe': `<${unsub}>, <mailto:${TEAM_INBOX}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        html:
          `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5">` +
          `<p>Hi ${esc(listing.name)},</p>` +
          `<p>${followUp ? 'Two days ago a' : 'A'} customer found your business on HireAnyPro and asked for a quote.</p>` +
          `<table style="background:#f3f4f6;padding:12px;border-radius:6px;width:100%"><tr><td><strong>Service:</strong> ${esc(cat)}</td></tr>` +
          `<tr><td><strong>City:</strong> ${esc(city)}</td></tr><tr><td><strong>Requested:</strong> ${esc(date)}</td></tr>` +
          `<tr><td><strong>Contact details:</strong> 🔒 locked on the free plan</td></tr></table>` +
          `<p><a href="${cta.href}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${cta.label}</a></p>` +
          `<p style="font-size:14px;color:#444">${steps}</p>` +
          `<p style="font-size:14px;color:#444">Questions? Just reply to this email.</p>` +
          `<p style="color:#888;font-size:12px;margin-top:32px">HireAnyPro · CRRE Labs LLC · 12394 SW 82 Ave, Pinecrest FL 33156 · ` +
          `You got this because a customer contacted your listing on HireAnyPro. <a href="${unsub}" style="color:#888">Unsubscribe</a></p></div>`,
      };
    },
  };
}
