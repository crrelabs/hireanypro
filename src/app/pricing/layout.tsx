import type { Metadata } from 'next';
import Link from 'next/link';
import { faqPageJsonLd } from '@/lib/directory-content';

export const metadata: Metadata = {
  title: 'Pricing for Pros: Free, Pro $9/mo, Featured $49.99/mo — HireAnyPro',
  description: 'Get more Florida customers. List your business free, or upgrade to Pro ($9/mo) or Featured ($49.99/mo) for direct leads, a verified badge and top placement.',
  alternates: { canonical: 'https://hireanypro.com/pricing' },
};

// Answers to the questions owners ask before paying. Keep every answer true to how the product works today
// (no money-back promise: the Terms don't include one).
const faqs = [
  {
    q: 'Is the free listing really free?',
    a: 'Yes. Claiming and editing your listing costs nothing and there is no card required. You only pay if you choose Pro or Featured.',
  },
  {
    q: 'How do I claim my business?',
    a: 'Search for your business on the claim page, enter your business email and click the verification link we send. It only takes a couple of minutes.',
  },
  {
    q: 'What changes when I upgrade to Pro?',
    a: 'Quote requests go straight to your inbox with the customer\u2019s full name, phone and email, your phone, email and website are shown on your listing, you get a verified badge and you rank above free listings in your category and city.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. Plans are month to month and billed through Stripe. To cancel, email iris@hireanypro.com; cancellation takes effect at the end of the current billing period and there is no cancellation fee.',
  },
  {
    q: 'What does Featured add?',
    a: 'Everything in Pro, plus top placement in searches, a highlighted listing card, a spot in the featured pros section on the homepage and lead stats in your dashboard.',
  },
  {
    q: 'My business isn\u2019t listed. Can I still join?',
    a: 'Yes. Email iris@hireanypro.com with your business name, city and phone number and we will add it, then you can claim it for free.',
  },
];

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs)) }} />
      <section className="max-w-3xl mx-auto px-4 pb-16" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-2xl font-bold text-gray-900 mb-6 text-center">Questions owners ask</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="bg-white border border-gray-200 rounded-lg p-4 group">
              <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                {f.q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="text-gray-700 text-sm mt-2">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-center text-sm text-gray-600 mt-8">
          Not sure yet? <Link href="/claim?utm_source=pricing_faq&utm_medium=web" className="text-blue-800 font-medium hover:underline">Claim your free listing first</Link> and upgrade any time.
        </p>
      </section>
    </>
  );
}
