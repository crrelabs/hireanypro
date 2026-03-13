import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — HireAnyPro',
  description: 'How HireAnyPro collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: March 8, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
          <p>HireAnyPro is operated by CRRE Labs LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;), located at 12394 SW 82 Ave, Pinecrest, FL 33156. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit hireanypro.com or use our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
          <p><strong>Information You Provide:</strong> Name, email address, phone number, business information, and any other information you submit through forms, listings, or communications.</p>
          <p className="mt-2"><strong>Automatically Collected Information:</strong> IP address, browser type, operating system, referring URLs, pages viewed, access times, and device information.</p>
          <p className="mt-2"><strong>Cookies and Tracking:</strong> We use cookies, Google Analytics (GA4), and similar technologies to analyze usage and improve your experience.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Operate and maintain the HireAnyPro directory and services</li>
            <li>Display business listings and connect service providers with customers</li>
            <li>Process claims, subscriptions, and payments</li>
            <li>Send service notifications, lead alerts, and account updates</li>
            <li>Send promotional offers and marketing communications (with your consent)</li>
            <li>Send SMS text messages about leads and service requests (with your consent)</li>
            <li>Improve our platform and user experience</li>
            <li>Comply with legal obligations and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. SMS/Text Messaging</h2>
          <p>By providing your phone number and checking the SMS consent box on our claim form or contact form at hireanypro.com, you expressly consent to receive SMS text messages from HireAnyPro (operated by CRRE Labs LLC). Messages may include notifications about new leads, service requests in your area, account updates, and promotional offers.</p>
          <p className="mt-2"><strong>Consent:</strong> You opt in by submitting our claim form or contact form with the SMS consent checkbox checked. Consent is not a condition of purchase.</p>
          <p className="mt-2"><strong>Message Frequency:</strong> Message frequency varies based on lead volume in your area. You may receive up to 10 messages per month.</p>
          <p className="mt-2"><strong>Costs:</strong> Message and data rates may apply. HireAnyPro does not charge for text messages, but your mobile carrier may apply standard messaging fees.</p>
          <p className="mt-2"><strong>Opt-Out:</strong> Reply <strong>STOP</strong> to any message to opt out. You will receive one final confirmation message.</p>
          <p className="mt-2"><strong>Help:</strong> Reply <strong>HELP</strong> for assistance, or contact us at <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a> or <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a>.</p>
          <p className="mt-2"><strong>Carriers:</strong> Compatible with all major U.S. carriers including AT&amp;T, Verizon, T-Mobile, and others. Carriers are not liable for delayed or undelivered messages.</p>
          <p className="mt-2">For complete details, see our <Link href="/sms-policy" className="text-blue-800 hover:underline">SMS &amp; Messaging Policy</Link>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Sharing of Information</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Service Providers:</strong> Payment processors (Stripe), hosting, analytics, and email delivery services</li>
            <li><strong>Public Listings:</strong> Business name, address, phone, and reviews are displayed publicly as part of the directory</li>
            <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
          <p>We implement reasonable administrative, technical, and physical safeguards to protect your information. Data is stored securely using industry-standard encryption. However, no method of transmission over the Internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
          <p>We retain your information for as long as your account is active or as needed to provide services. Business listing data remains in the directory unless removal is requested. We will delete or anonymize your information upon request, subject to legal requirements.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
          <p>You may:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Access, correct, or delete your personal information</li>
            <li>Opt out of marketing emails and SMS messages</li>
            <li>Request removal of your business listing</li>
            <li>Request a copy of your data</li>
          </ul>
          <p className="mt-2">Contact us at <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a> to exercise any of these rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Third-Party Links</h2>
          <p>Our site may contain links to third-party websites. We are not responsible for the privacy practices of those sites.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Children&apos;s Privacy</h2>
          <p>Our services are not directed to individuals under 13. We do not knowingly collect information from children.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
          <p>We may update this policy from time to time. Changes will be posted on this page with an updated date.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
          <p>CRRE Labs LLC<br />12394 SW 82 Ave<br />Pinecrest, FL 33156<br />Email: <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a><br />Phone: <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a></p>
        </section>

      </div>
    </div>
  );
}
