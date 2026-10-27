import { sendMail } from '@/lib/mailer';
import { badgeSnippet, badgeListingUrl } from '@/lib/badge';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Email the owner a one-click link that verifies their listing claim. */
export async function sendClaimVerification(to: string, listingName: string, token: string, opts: { reissued?: boolean } = {}): Promise<boolean> {
  const verifyUrl = `https://hireanypro.com/verify-claim?token=${token}`;
  const name = esc(listingName);
  try {
    return await sendMail({
      to,
      campaign: 'claim_verify',
      subject: `Verify your claim for ${listingName} on HireAnyPro`,
      text: `${opts.reissued ? 'Your previous link expired, so here is a fresh one. ' : ''}Verify your claim for ${listingName}: ${verifyUrl}\n\nThis link expires in 24 hours. If you didn't request this, ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">Verify Your Business Claim</h2>
          ${opts.reissued ? '<p>Your previous verification link expired, so here is a fresh one.</p>' : ''}
          <p>You requested to claim <strong>${name}</strong> on HireAnyPro.</p>
          <p>Click the button below to verify your email and complete your claim. It's free and takes one click.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: #1e40af; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify &amp; Claim Your Listing
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Button not working? Paste this link into your browser:<br>${verifyUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">HireAnyPro — Find Trusted Home Service Professionals</p>
        </div>
      `,
    });
  } catch (e) {
    console.error('Verification email failed:', e);
    return false;
  }
}

/** After a claim is verified: confirm it, point to the dashboard, and offer the "Find us on HireAnyPro" badge. */
export async function sendClaimConfirmed(to: string, listingName: string, slug: string): Promise<boolean> {
  const name = esc(listingName);
  const listingUrl = badgeListingUrl(slug);
  const snippet = badgeSnippet(slug, listingName);
  try {
    return await sendMail({
      to,
      campaign: 'claim_confirmed',
      subject: `You're all set: ${listingName} is claimed on HireAnyPro`,
      text: `Your claim for ${listingName} is confirmed.\n\nYour listing: ${listingUrl}\nYour dashboard (edit details, see quote requests): https://hireanypro.com/dashboard\n\nOptional: add a "Find us on HireAnyPro" badge to your website so customers can read your reviews and request a quote. Paste this code on your site:\n\n[[notag]]${snippet}[[/notag]]\n\nQuestions? Just reply to this email.\n\nHireAnyPro, 12394 SW 82 Ave, Pinecrest FL 33156`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #374151;">
          <h2 style="color: #1e40af;">You're all set</h2>
          <p>Your claim for <strong>${name}</strong> is confirmed.</p>
          <p><a href="${listingUrl}" style="color: #1e40af;">View your listing</a> · <a href="https://hireanypro.com/dashboard" style="color: #1e40af;">Open your dashboard</a> to edit your details and see quote requests.</p>
          <h3 style="color: #111827; margin-top: 28px;">Optional: show the badge on your website</h3>
          <p>Add a "Find us on HireAnyPro" badge to your site so customers can read your reviews and request a quote. Paste this code into your website's footer or reviews page:</p>
          <p><img src="https://hireanypro.com/api/badge/${encodeURIComponent(slug)}" alt="Find us on HireAnyPro" width="200" height="56"></p>
          <pre style="white-space: pre-wrap; word-break: break-all; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-size: 12px;">[[notag]]${esc(snippet)}[[/notag]]</pre>
          <p style="color: #666; font-size: 14px;">You can also copy it any time from your dashboard. Questions? Just reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">HireAnyPro · 12394 SW 82 Ave, Pinecrest FL 33156</p>
        </div>
      `,
    });
  } catch (e) {
    console.error('Claim confirmation email failed:', e);
    return false;
  }
}
