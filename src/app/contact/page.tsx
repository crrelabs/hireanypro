import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us — HireAnyPro',
  description: 'Contact HireAnyPro by email or phone.',
  alternates: { canonical: 'https://hireanypro.com/contact' },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact HireAnyPro</h1>
      <p className="mb-6">HireAnyPro is a Florida home-services directory operated by CRRE Labs LLC. We&apos;re happy to help homeowners and businesses.</p>
      <ul className="space-y-2 mb-8">
        <li><strong>Email:</strong> <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a></li>
        <li><strong>Phone / text:</strong> <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a></li>
        <li><strong>Mail:</strong> CRRE Labs LLC, 12394 SW 82 Ave, Pinecrest, FL 33156</li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Text messages</h2>
      <p>If you opted in to HireAnyPro Alerts, reply STOP to any text to opt out or HELP for help. Message frequency varies. Msg &amp; data rates may apply. Details: <Link href="/sms-policy" className="text-blue-800 hover:underline">SMS Policy</Link>, <Link href="/terms" className="text-blue-800 hover:underline">Terms</Link>, <Link href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</Link>.</p>
    </div>
  );
}
