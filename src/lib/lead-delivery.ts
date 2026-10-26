import type { SupabaseClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';
import { isSuppressed } from '@/lib/suppression';
import { leadTeaser } from '@/lib/lead-upsell';
import { queueLeadSms, teaserBody, smsEnabled, optedInPhone } from '@/lib/sms-leads';

export const SITE = 'https://hireanypro.com';
export const TEAM_INBOX = 'iris@hireanypro.com';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
export const firstName = (n: string) => n.split(/\s+/)[0] || 'there';

export type LeadListing = {
  id: string; name: string; slug: string; email: string | null; phone: string | null; tier: string | null; claimed: boolean | null;
  city: string | null; categories: { name: string; slug: string } | null;
};
export type Lead = { name: string; email: string; phone: string; message: string };

export const shell = (inner: string, footer = '') =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5">${inner}` +
  `<p style="color:#888;font-size:12px;margin-top:32px">HireAnyPro · CRRE Labs LLC · 12394 SW 82 Ave, Pinecrest FL 33156${footer}</p></div>`;

export const isPaidTier = (t: string | null | undefined) => t === 'pro' || t === 'featured';

// Listings we never auto-select when the server picks pros for a homeowner (multi-quote, "also ask others").
export const NEVER_ROUTE = new Set(['rovira-property-management-pinecrest', 'monster-cuts-orlando']);
export const routable = (l: { slug: string }) => !NEVER_ROUTE.has(l.slug) && !l.slug.startsWith('zz-hap-test');
// Ranking used whenever the server chooses pros: paid > claimed > reachable by email > most reviews > rating.
export const proScore = (l: { tier: string | null; claimed: boolean | null; email: string | null; review_count?: number | null; rating?: number | null }) =>
  (isPaidTier(l.tier) ? 1e6 : 0) + (l.claimed ? 1e5 : 0) + (l.email && EMAIL_RE.test(l.email.trim()) ? 1e4 : 0)
  + Math.min(l.review_count || 0, 5000) + (l.rating || 0);
// Internal QA addresses: saved as 'internal' and no business is ever contacted.
export const isInternalEmail = (e: string) => /@(hireanypro|crrelabs)\.com$/i.test(e);
export function bizEmailOf(l: { email: string | null }) {
  return l.email && EMAIL_RE.test(l.email.trim()) ? l.email.trim().toLowerCase() : null;
}

/**
 * Deliver one saved lead to one business: SMS alert (opted-in claimed only), full lead to paid listings,
 * a locked "claim/upgrade to see it" teaser to free listings with an email. Returns a note for the team copy.
 * Never throws; email failures never fail the request because the inquiry is already saved.
 */
export async function deliverToListing(
  supabase: SupabaseClient, listing: LeadListing, lead: Lead, inquiryId: string | undefined,
  opts: { skipTeaserIfRecent?: boolean } = {},
): Promise<string> {
  const cat = listing.categories?.name || 'home service';
  const city = listing.city || 'your area';
  const notes: string[] = [];
  try {
    const smsTo = listing.claimed ? await optedInPhone(supabase, listing.id).catch(() => null) : null;
    if (smsTo) {
      const st = await queueLeadSms(supabase, { inquiryId, listingId: listing.id, phone: smsTo,
        body: teaserBody({ name: listing.name, cat, city }) }).catch(() => 'error');
      notes.push(`SMS alert to opted-in business phone: ${st}${smsEnabled() ? '' : ' (SMS is off)'}`);
    }
    const bizEmail = bizEmailOf(listing);
    if (isPaidTier(listing.tier) && bizEmail) {
      const ok = await sendMail({
        to: bizEmail,
        replyTo: lead.email,
        subject: `New quote request from ${lead.name} via HireAnyPro`,
        html: shell(`<p>You have a new customer request on HireAnyPro.</p>` +
          `<p><strong>Name:</strong> ${esc(lead.name)}<br><strong>Email:</strong> ${esc(lead.email)}${lead.phone ? `<br><strong>Phone:</strong> ${esc(lead.phone)}` : ''}</p>` +
          `<p style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(lead.message)}</p>` +
          `<p>Reply to this email to answer them directly.</p>`),
      });
      notes.push(`Full lead emailed to paid listing: ${ok ? 'sent' : 'FAILED'}`);
    } else if (bizEmail && !(await isSuppressed(bizEmail))) {
      if (opts.skipTeaserIfRecent) {
        // Don't email the same free business more than once every 3 days, however many requests come in.
        const { data: recent } = await supabase.from('inquiries').select('id')
          .eq('listing_id', listing.id).gte('upsell_sent_at', new Date(Date.now() - 3 * 86400e3).toISOString()).limit(1);
        if (recent && recent.length) { notes.push('Teaser skipped (business already alerted in the last 3 days)'); return notes.join('; '); }
      }
      const tease = leadTeaser({ listing, cat, city, when: new Date(), followUp: false, toEmail: bizEmail });
      const ok = await sendMail(tease.mail(bizEmail));
      if (ok && inquiryId) await supabase.from('inquiries').update({ upsell_sent_at: new Date().toISOString() }).eq('id', inquiryId);
      notes.push(`Locked teaser to free listing: ${ok ? 'sent' : 'FAILED'}`);
    } else {
      notes.push('No business email (team follows up)');
    }
  } catch (e) {
    console.error('deliverToListing error', e);
    notes.push('delivery error');
  }
  return notes.join('; ');
}
