import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SMS Opt-In — HireAnyPro Alerts',
  description: 'How to opt in to HireAnyPro Alerts text messages, with the full consent disclosure.',
  alternates: { canonical: 'https://hireanypro.com/sms-opt-in' },
};

export const dynamic = 'force-static';

export default function SmsOptInPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-gray-700">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">HireAnyPro Alerts: SMS Opt-In</h1>
      <p className="mb-6">Business owners opt in to HireAnyPro Alerts when they claim their free listing at <Link href="/claim" className="text-blue-800 hover:underline">hireanypro.com/claim</Link>. Homeowners can opt in on the quote request form on any business listing. The SMS box is optional, is never pre-checked, and is its own checkbox: it is not combined with any other consent, and claiming a listing or submitting a quote request does not require it. HireAnyPro Alerts texts are transactional only (new quote requests, quote confirmations and account notices); no marketing consent is collected for SMS and no marketing texts are sent. Any optional email newsletter consent on the claim form is a separate checkbox and covers email only. This is the exact SMS consent language shown to users:</p>

      <form action="/claim" method="get" className="border border-gray-300 rounded-lg p-6 bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">Your email address</label>
        <input id="email" type="email" name="email" className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4" placeholder="you@business.com" />
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="phone">Mobile phone number</label>
        <input id="phone" type="tel" name="phone" className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4" placeholder="Your mobile number" />
        <label className="flex items-start gap-3 mb-4">
          <input type="checkbox" name="sms" className="mt-1 w-4 h-4" />
          <span className="text-sm text-gray-600">
            (Optional) I consent to receive SMS text messages from HireAnyPro Alerts (CRRE Labs LLC) at the phone number provided above, including new lead notifications, quote request updates, and account updates. No marketing or promotional texts are sent. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See our{' '}
            <Link href="/terms#sms-terms" className="text-blue-800 hover:underline">SMS Terms</Link> and{' '}
            <Link href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        <button type="submit" className="bg-blue-800 text-white px-6 py-3 rounded-lg">Continue to claim your listing</button>
      </form>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">Program details</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Program name: HireAnyPro Alerts</li>
        <li>Message frequency varies. Message and data rates may apply.</li>
        <li>Reply STOP to opt out. Reply HELP for help, or contact iris@hireanypro.com or (786) 699-6091.</li>
        <li>Carriers are not liable for delayed or undelivered messages.</li>
        <li>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.</li>
      </ul>
    </div>
  );
}
