import { faqPageJsonLd } from './directory-content';

/**
 * Visible /claim FAQ. The same strings are rendered as HTML and as FAQPage JSON-LD.
 * Keep every answer true to the product today: free claim, email or one-click verification,
 * Pro vs free, and editing after claim. No free Pro trial and no money-back promise.
 */
export type ClaimFaq = { q: string; a: string };

export const claimFaqs: ClaimFaq[] = [
  {
    q: 'Is claiming free?',
    a: 'Yes. Claiming your listing is free forever. No credit card. Pro ($9/month) and Featured ($49.99/month) are optional, and there is no free Pro trial. Paid plans are month to month. You can cancel anytime; the plan runs through the end of the billing period, and fees are not refundable except where the law requires it.',
  },
  {
    q: 'How do I verify?',
    a: 'If you open the signed link we emailed to the address on your listing, one click claims it. That link proves you control the inbox, so we do not send a second email. Otherwise enter your business email on this page and we send a verification link that expires in 24 hours. Click that link to finish the claim.',
  },
  {
    q: 'What does Pro ($9/mo) add vs free?',
    a: 'A free claimed listing lets you correct your phone, hours, services, website and description, and shows the business as claimed. Quote requests are emailed to you, but the customer\u2019s name, phone, email and message stay locked. Pro ($9/month) shows your phone, email and website on the listing, adds a Verified badge, ranks the listing above free listings in its category and city, and includes the customer\u2019s full contact details on every request.',
  },
  {
    q: 'Can I edit after claiming?',
    a: 'Yes. After you verify, you can edit the listing from your dashboard: phone, hours, services, website and description. Only the verified owner can edit it. The free listing stays editable if you never upgrade.',
  },
];

/** FAQPage object for /claim. Answers are the same strings as the visible HTML. */
export function claimFaqJsonLd() {
  return faqPageJsonLd(claimFaqs);
}
