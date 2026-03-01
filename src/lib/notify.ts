/**
 * Send notifications when claims or upgrades happen.
 * Uses a simple webhook approach — can be extended to email later.
 */

const NOTIFY_EMAIL = 'carlos@crrelabs.com';

export async function notifyNewClaim(businessName: string, claimerEmail: string, listingSlug: string) {
  const subject = `New HireAnyPro Claim: ${businessName}`;
  const body = `${businessName} was claimed by ${claimerEmail}\n\nListing: https://hireanypro.com/listing/${listingSlug}`;
  await sendNotification(subject, body);
}

export async function notifyUpgrade(businessName: string, ownerEmail: string, tier: string, listingSlug: string) {
  const subject = `New HireAnyPro Upgrade: ${businessName} → ${tier.toUpperCase()}`;
  const body = `${businessName} upgraded to ${tier.toUpperCase()} plan!\n\nOwner: ${ownerEmail}\nListing: https://hireanypro.com/listing/${listingSlug}`;
  await sendNotification(subject, body);
}

async function sendNotification(subject: string, body: string) {
  // Send via Resend if available, otherwise log
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'HireAnyPro <notifications@hireanypro.com>',
          to: NOTIFY_EMAIL,
          subject,
          text: body,
        }),
      });
    } catch (e) {
      console.error('Resend notification failed:', e);
    }
  } else {
    // Fallback: log to console (visible in Vercel logs)
    console.log(`📧 NOTIFICATION → ${NOTIFY_EMAIL}\nSubject: ${subject}\n${body}`);
  }
}
