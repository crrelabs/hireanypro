import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — HireAnyPro',
  description: 'Terms and conditions for using HireAnyPro services.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-gray-500 mb-10">Last updated: March 8, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using HireAnyPro (hireanypro.com), operated by CRRE Labs LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;), located at 12394 SW 82 Ave, Pinecrest, FL 33156, you agree to these Terms of Service. If you do not agree, do not use our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Services</h2>
          <p>HireAnyPro is an online directory connecting homeowners and businesses with home service professionals. Our services include:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Business listing directory with search, categories, and reviews</li>
            <li>Lead generation and inquiry routing for listed businesses</li>
            <li>Paid subscription plans for enhanced visibility and features</li>
            <li>SMS and email notifications about leads and service requests</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Subscription Plans</h2>
          <p>We offer the following plans for service providers:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Free:</strong> Basic listing in the directory</li>
            <li><strong>Pro ($9/mo):</strong> Direct lead access, verified badge, priority support</li>
            <li><strong>Featured ($49.99/mo):</strong> Top placement in search results, homepage carousel, all Pro features</li>
          </ul>
          <p className="mt-2">Subscriptions are billed monthly via Stripe. You may cancel at any time; cancellation takes effect at the end of the current billing period. Subscription fees are non-refundable except as required by law. We may change pricing with 30 days&apos; notice.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Claiming a Listing</h2>
          <p>By claiming a business listing, you represent that you are authorized to manage that business. False claims may result in removal from the platform. We verify claims via email and reserve the right to reject or revoke claims at our discretion.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Provide accurate and current business information</li>
            <li>Not submit false reviews or misleading content</li>
            <li>Not misuse, scrape, or disrupt the platform</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Reviews</h2>
          <p>Users may submit reviews of listed businesses. Reviews must be honest and based on genuine experiences. We reserve the right to remove reviews that are fraudulent, abusive, or violate these terms. Businesses may respond to reviews through their dashboard.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. SMS and Email Communications</h2>
          <p>By opting in, you consent to receive SMS and email communications including lead notifications, service requests, account updates, and promotional offers. You may opt out at any time by replying STOP to SMS or clicking unsubscribe in emails. See our <Link href="/sms-policy" className="text-blue-800 hover:underline">SMS Policy</Link> for full details.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Payment Terms</h2>
          <p>Payments are processed securely through Stripe. By subscribing, you authorize recurring charges to your payment method. Failed payments may result in downgrade to the Free plan. Refunds are not provided for partial months.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Intellectual Property</h2>
          <p>All content, design, code, and branding on HireAnyPro are the property of CRRE Labs LLC. Business listing data provided by you remains your property. You grant us a license to display your business information on the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
          <p>HireAnyPro is a directory platform. We do not guarantee the quality, safety, or legality of services provided by listed businesses. To the maximum extent permitted by law, CRRE Labs LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the platform. Our total liability shall not exceed amounts paid to us in the 12 months preceding the claim.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Indemnification</h2>
          <p>You agree to indemnify and hold harmless CRRE Labs LLC from any claims arising from your use of the platform, your business listings, or violation of these terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Termination</h2>
          <p>We may suspend or remove your listing or account for violation of these terms, non-payment, or at our discretion. Upon termination, your subscription and access to paid features end immediately.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
          <p>These terms are governed by the laws of the State of Florida. Disputes shall be resolved in the courts of Miami-Dade County, Florida.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to Terms</h2>
          <p>We may update these terms. Changes will be posted here with an updated date. Continued use of the platform constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Us</h2>
          <p>CRRE Labs LLC<br />12394 SW 82 Ave<br />Pinecrest, FL 33156<br />Email: <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a><br />Phone: <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a></p>
        </section>

      </div>
    </div>
  );
}
