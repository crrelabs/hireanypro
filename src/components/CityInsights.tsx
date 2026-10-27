import Link from 'next/link';
import {
  buildCityFaqs,
  buildCityIntroParts,
  cityStatCards,
  faqPageJsonLd,
  type CityStats,
  type NeighborCity,
  type SiblingCategory,
  type TextPart,
} from '@/lib/directory-content';

function Parts({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, i) => part.href ? (
        <Link key={i} href={part.href} className="text-blue-800 hover:underline">{part.text}</Link>
      ) : (
        <span key={i}>{part.text}</span>
      ))}
    </>
  );
}

type CityCopy = {
  categoryName: string;
  categorySlug: string;
  cityName: string;
  citySlug: string;
  stateCode: string;
  stateName: string;
  county: string | null;
  count: number;
  stats: CityStats;
  neighbors: NeighborCity[];
  siblings: SiblingCategory[];
};

/** Data-driven intro. Every sentence is computed from this city and category. */
export function CityIntro(props: CityCopy) {
  const paragraphs = buildCityIntroParts(props);
  return (
    <section className="mb-8 text-gray-700 leading-relaxed max-w-4xl space-y-4">
      {paragraphs.map((parts, i) => (
        <p key={i}><Parts parts={parts} /></p>
      ))}
    </section>
  );
}

export function CityStatsBlock({ categoryName, cityName, count, stats }: Pick<CityCopy, 'categoryName' | 'cityName' | 'count' | 'stats'>) {
  const cards = cityStatCards(count, stats);
  return (
    <section className="mb-8" aria-label={`${categoryName} in ${cityName} statistics`}>
      <h2 className="text-lg font-bold text-gray-900 mb-3">{categoryName} in {cityName} at a glance</h2>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{card.value}</dd>
            {card.detail && <dd className="text-xs text-gray-500 mt-0.5">{card.detail}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

/** FAQ block + FAQPage JSON-LD + claim CTA. Answers are the same strings as the structured data. */
export function CityFaq(props: CityCopy) {
  const faqs = buildCityFaqs(props);
  const faqJsonLd = faqPageJsonLd(faqs);
  const cat = props.categoryName.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="mt-16 max-w-4xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{props.categoryName} in {props.cityName}: Frequently Asked Questions</h2>
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
          <h2 className="text-lg font-bold text-gray-900">Own a {cat} business in {props.cityName}?</h2>
          <p className="text-gray-700 text-sm">Your business may already be listed here. Claim it free to fix your details and receive quote requests from {props.cityName} homeowners.</p>
        </div>
        <Link href={`/claim?utm_source=city_page&utm_medium=web&utm_campaign=${props.categorySlug}-${props.citySlug}`} className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-3 rounded-lg text-sm text-center">
          Claim Your Free Listing
        </Link>
      </section>
    </>
  );
}
