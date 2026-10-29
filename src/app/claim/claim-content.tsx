import Link from 'next/link';

const BENEFITS: [string, string, string][] = [
  ['📨', 'Get customer quote requests', 'When homeowners request quotes in your area, claimed pros receive them by email (and text, if you opt in).'],
  ['✏️', 'Fix your info', 'Update your phone, hours, services, website and description.'],
  ['✅', 'Show as a claimed business', 'Claimed profiles look trustworthy and stand out from unclaimed ones.'],
  ['🔒', 'Stay in control', 'Only you can edit your listing after you verify your email.'],
];

/** Default heading. The one-click heading is filled in by the form after it reads the query string in the browser. */
export function ClaimIntro() {
  return (
    <div className="text-center mb-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Claim Your Business Listing</h1>
      <p className="text-gray-600">Free forever. No credit card. Takes about a minute.</p>
    </div>
  );
}

export function ClaimBenefits({ after = false }: { after?: boolean }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm ${after ? 'mt-10' : 'mb-10'}`}>
      {BENEFITS.map(([icon, title, text]) => (
        <div key={title} className="flex gap-3 bg-white border border-gray-200 rounded-lg p-4">
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <div>
            <div className="font-semibold text-gray-900">{title}</div>
            <div className="text-gray-600">{text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Facts that are true: who operates the site, how many listings are actually claimed, and what we do with contact info. */
export function ClaimTrust({ claimedCount }: { claimedCount: number }) {
  return (
    <section className="mt-12 border-t border-gray-200 pt-8 text-sm text-gray-600 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Who runs HireAnyPro</h2>
      <p>
        HireAnyPro is a Florida home-services directory operated by CRRE Labs LLC in Pinecrest, Florida.
        Email <a href="mailto:iris@hireanypro.com" className="text-blue-800 hover:underline">iris@hireanypro.com</a>
        {' '}or call <a href="tel:+17866996091" className="text-blue-800 hover:underline">(786) 699-6091</a>.
        Mail: CRRE Labs LLC, 12394 SW 82 Ave, Pinecrest, FL 33156.
      </p>
      {claimedCount >= 1 && (
        <p>
          {claimedCount.toLocaleString('en-US')} {claimedCount === 1 ? 'business has' : 'businesses have'} claimed a listing on HireAnyPro.
        </p>
      )}
      <h2 className="text-lg font-semibold text-gray-900">How claiming works</h2>
      <p>
        If you open the signed link we emailed you, you can claim in one click. Otherwise we email a verification link.
        The link expires in 24 hours. By claiming, you confirm you are authorized to manage the business.
      </p>
      <h2 className="text-lg font-semibold text-gray-900">Email and phone</h2>
      <p>
        We use your email and phone to verify the claim and to send quote requests and account messages.
        Texts are sent only if you opt in to SMS. We don&apos;t sell your contact information.{' '}
        <Link href="/privacy" className="text-blue-800 hover:underline">Privacy Policy</Link>.
      </p>
    </section>
  );
}
