import { sendMail } from '@/lib/mailer';

const NOTIFY_EMAIL = 'carlos@crrelabs.com';

async function sendNotification(subject: string, body: string) {
  const ok = await sendMail({ to: NOTIFY_EMAIL, subject, text: body });
  if (!ok) console.log(`📧 NOTIFICATION (send failed) → ${NOTIFY_EMAIL}
Subject: ${subject}
${body}`);
}

export async function notifyNewClaim(businessName: string, claimerEmail: string, listingSlug: string) {
  await sendNotification(
    `HireAnyPro claim started: ${businessName}`,
    `${claimerEmail} started claiming ${businessName} (pending email verification)\n\nListing: https://hireanypro.com/listing/${listingSlug}\nDashboard: https://hireanypro.com/dashboard`
  );
}

export async function notifyUpgrade(businessName: string, ownerEmail: string, tier: string, listingSlug: string) {
  await sendNotification(
    `💰 New HireAnyPro Upgrade: ${businessName} → ${tier.toUpperCase()}`,
    `${businessName} upgraded to ${tier.toUpperCase()} plan!\n\nOwner: ${ownerEmail}\nListing: https://hireanypro.com/listing/${listingSlug}\n\nRevenue: ${tier === 'pro' ? '$9/mo' : '$49.99/mo'}`
  );
}

export async function notifyVerifiedClaim(businessName: string, ownerEmail: string, listingSlug: string) {
  await sendNotification(
    `HireAnyPro listing claimed: ${businessName}`,
    `${ownerEmail} claimed ${businessName} with a one-click link sent to the email on file (verified, no second email needed).\n\nListing: https://hireanypro.com/listing/${listingSlug}`
  );
}
