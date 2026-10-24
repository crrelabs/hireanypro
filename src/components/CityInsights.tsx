import Link from 'next/link';

/** "Plumbing" -> "plumbing", but keep acronyms like "HVAC" intact. */
const lc = (s: string) => s.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');

type L = { name: string; slug: string; rating?: number | null; review_count?: number | null; zip?: string | null };

function stats(listings: L[]) {
  const rated = listings.filter((l) => (l.rating || 0) > 0 && (l.review_count || 0) > 0);
  const totalReviews = rated.reduce((s, l) => s + (l.review_count || 0), 0);
  const avg = totalReviews ? rated.reduce((s, l) => s + (l.rating || 0) * (l.review_count || 0), 0) / totalReviews : 0;
  const top = [...rated]
    .filter((l) => (l.review_count || 0) >= 5)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.review_count || 0) - (a.review_count || 0))
    .slice(0, 3);
  const zips = [...new Set(listings.map((l) => (l.zip || '').slice(0, 5)).filter((z) => /^3[234]\d{3}$/.test(z)))].sort().slice(0, 12);
  return { rated: rated.length, totalReviews, avg, top, zips };
}

/** Unique, data-driven copy for a category+city page (intro). */
export function CityIntro({ categoryName, cityName, count, listings }: { categoryName: string; cityName: string; count: number; listings: L[] }) {
  const s = stats(listings);
  const cat = lc(categoryName);
  return (
    <section className="mb-8 text-gray-700 leading-relaxed max-w-4xl">
      <p>
        HireAnyPro lists <strong>{count.toLocaleString()} {cat} {count === 1 ? 'business' : 'businesses'}</strong> serving {cityName}, Florida.
        {s.rated > 0 && <> {s.rated.toLocaleString()} of them have public customer ratings, averaging <strong>{s.avg.toFixed(1)} out of 5</strong> across {s.totalReviews.toLocaleString()} reviews.</>}
        {s.top.length > 0 && <> The highest-rated include{' '}
          {s.top.map((l, i) => (
            <span key={l.slug}>
              {i > 0 && (i === s.top.length - 1 ? ' and ' : ', ')}
              <Link href={`/listing/${l.slug}`} className="text-blue-800 hover:underline">{l.name}</Link> ({(l.rating || 0).toFixed(1)}★, {l.review_count} reviews)
            </span>
          ))}.</>}
        {' '}Compare pros below and request a free quote. It costs nothing and you&apos;re never obligated to hire.
      </p>
    </section>
  );
}

/** FAQ block + FAQPage JSON-LD + "own a business here?" claim CTA. */
export function CityFaq({ categoryName, categorySlug, cityName, citySlug, count, listings }: { categoryName: string; categorySlug: string; cityName: string; citySlug: string; count: number; listings: L[] }) {
  const s = stats(listings);
  const cat = lc(categoryName);
  const faqs: { q: string; a: string }[] = [
    { q: `How many ${cat} pros are in ${cityName}, FL?`, a: `HireAnyPro currently lists ${count.toLocaleString()} ${cat} ${count === 1 ? 'business' : 'businesses'} in ${cityName}, Florida${s.zips.length ? `, including pros based in ZIP codes ${s.zips.join(', ')}` : ''}.` },
    ...(s.top.length ? [{ q: `Who are the top-rated ${cat} pros in ${cityName}?`, a: `Based on public customer ratings with at least 5 reviews, the highest-rated ${cat} pros in ${cityName} include ${s.top.map((l) => `${l.name} (${(l.rating || 0).toFixed(1)} stars from ${l.review_count} reviews)`).join(', ')}.` }] : []),
    ...(s.rated ? [{ q: `What is the average rating for ${cat} in ${cityName}?`, a: `${s.rated.toLocaleString()} ${cat} businesses in ${cityName} have public ratings, with a review-weighted average of ${s.avg.toFixed(1)} out of 5 across ${s.totalReviews.toLocaleString()} reviews.` }] : []),
    { q: `How do I get a ${cat} quote in ${cityName}?`, a: `Open any listing on this page and use the free "Request a Quote" form. Describe the job and the business gets your request. It's free and there's no obligation to hire.` },
    { q: `What should I check before hiring ${cat} in Florida?`, a: `Confirm the business holds any license Florida requires for the work (you can search licenses at myfloridalicense.com), ask for proof of insurance, get a written estimate, and read recent reviews before you pay a deposit.` },
  ];
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="mt-16 max-w-4xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{categoryName} in {cityName}: Frequently Asked Questions</h2>
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="p-5 group">
              <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between gap-4">
                {f.q}<span className="text-gray-400 group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-gray-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="mt-12 p-6 rounded-xl border border-orange-200 bg-orange-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Own a {cat} business in {cityName}?</h2>
          <p className="text-gray-700 text-sm">Your business may already be listed here. Claim it free to fix your details and receive quote requests from {cityName} homeowners.</p>
        </div>
        <Link href={`/claim?utm_source=city_page&utm_medium=web&utm_campaign=${categorySlug}-${citySlug}`} className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-3 rounded-lg text-sm text-center">
          Claim Your Free Listing
        </Link>
      </section>
    </>
  );
}
