import { sendMail } from '@/lib/mailer';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Email the owner a one-click link that verifies their listing claim. */
export async function sendClaimVerification(to: string, listingName: string, token: string, opts: { reissued?: boolean } = {}): Promise<boolean> {
  const verifyUrl = `https://hireanypro.com/verify-claim?token=${token}`;
  const name = esc(listingName);
  try {
    return await sendMail({
      to,
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
