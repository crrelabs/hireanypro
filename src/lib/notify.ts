import nodemailer from 'nodemailer';

const NOTIFY_EMAIL = 'carlos@crrelabs.com';
const FROM_EMAIL = 'iris@hireanypro.com';

function getTransporter() {
  const pass = process.env.HIREANYPRO_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: FROM_EMAIL, pass },
  });
}

async function sendNotification(subject: string, body: string) {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `HireAnyPro <${FROM_EMAIL}>`,
        to: NOTIFY_EMAIL,
        subject,
        text: body,
      });
    } catch (e) {
      console.error('Email notification failed:', e);
    }
  } else {
    console.log(`📧 NOTIFICATION (no SMTP) → ${NOTIFY_EMAIL}\nSubject: ${subject}\n${body}`);
  }
}

export async function notifyNewClaim(businessName: string, claimerEmail: string, listingSlug: string) {
  await sendNotification(
    `New HireAnyPro Claim: ${businessName}`,
    `${businessName} was claimed by ${claimerEmail}\n\nListing: https://hireanypro.com/listing/${listingSlug}\nDashboard: https://hireanypro.com/dashboard`
  );
}

export async function notifyUpgrade(businessName: string, ownerEmail: string, tier: string, listingSlug: string) {
  await sendNotification(
    `💰 New HireAnyPro Upgrade: ${businessName} → ${tier.toUpperCase()}`,
    `${businessName} upgraded to ${tier.toUpperCase()} plan!\n\nOwner: ${ownerEmail}\nListing: https://hireanypro.com/listing/${listingSlug}\n\nRevenue: ${tier === 'pro' ? '$9/mo' : '$49.99/mo'}`
  );
}
