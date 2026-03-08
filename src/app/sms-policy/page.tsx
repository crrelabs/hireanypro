import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SMS & Messaging Policy — HireAnyPro',
  description: 'HireAnyPro SMS opt-in, opt-out, and messaging policy.',
};

export default function SmsPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS &amp; Messaging Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: March 8, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
          <p>HireAnyPro, operated by CRRE Labs LLC, may send SMS text messages to service providers and businesses that have opted in to receive communications. This policy describes our messaging practices, how you can opt in and out, and your rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Consent &amp; Opt-In</h2>
          <p>By providing your phone number and checking the SMS consent box on our website, you expressly consent to receive text messages from HireAnyPro. Consent is not a condition of purchase or use of our services. You may opt in by:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Claiming your business listing on hireanypro.com with SMS consent checked</li>
            <li>Submitting an inquiry or contact form with SMS consent checked</li>
            <li>Signing up for a paid subscription that includes SMS notifications</li>
            <li>Texting START or INFO to our designated number</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Types of Messages</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Lead alerts:</strong> Notifications when a homeowner requests a quote or contacts your business</li>
            <li><strong>Service requests:</strong> Alerts about service requests in your area matching your category</li>
            <li><strong>Account updates:</strong> Subscription confirmations, payment reminders, claim verifications</li>
            <li><strong>Promotional messages:</strong> Information about new features, upgraded plans, and special offers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Message Frequency</h2>
          <p>Message frequency varies based on lead volume in your area and your subscription plan. You may receive up to 10 messages per month for promotional communications and additional messages for lead alerts and transactional updates.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Opt-Out</h2>
          <p>You may opt out at any time by:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Replying <strong>STOP</strong> to any text message from us</li>
            <li>Emailing <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a> with subject &quot;Unsubscribe SMS&quot;</li>
            <li>Calling <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a></li>
          </ul>
          <p className="mt-2">After opting out, you will receive one final confirmation message. Transactional messages related to active subscriptions may continue.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Help</h2>
          <p>For help, reply <strong>HELP</strong> to any message, email <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a>, or call <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Costs</h2>
          <p>Message and data rates may apply. HireAnyPro does not charge for text messages, but your mobile carrier may charge standard messaging fees.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Supported Carriers</h2>
          <p>Compatible with most major U.S. carriers including AT&amp;T, Verizon, T-Mobile, and others. Carriers are not liable for delayed or undelivered messages.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Privacy</h2>
          <p>Your phone number is handled per our <a href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</a>. We do not sell or share your phone number with third parties for their marketing purposes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
          <p>CRRE Labs LLC<br />12394 SW 82 Ave<br />Pinecrest, FL 33156<br />Email: <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a><br />Phone: <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a></p>
        </section>

      </div>
    </div>
  );
}
