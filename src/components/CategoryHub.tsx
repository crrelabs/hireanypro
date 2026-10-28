import Link from 'next/link';
import { countySlug } from '@/lib/geo';
import {
  buildCategoryFaqs,
  buildCategoryIntro,
  categoryStatCards,
  faqPageJsonLd,
  shouldIndexCityPage,
  type CategoryNarrativeInput,
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

export function CategorySummary(props: CategoryNarrativeInput) {
  const paragraphs = buildCategoryIntro(props);
  const cards = categoryStatCards(props);
  return (
    <>
      <section className="mb-8 text-gray-700 leading-relaxed max-w-4xl space-y-4">
        {paragraphs.map((parts, i) => (
          <p key={i}><Parts parts={parts} /></p>
        ))}
      </section>
      <section className="mb-10" aria-label={`${props.categoryName} statistics`}>
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
    </>
  );
}

export function CategoryCounties({ categoryName, categorySlug, counties }: Pick<CategoryNarrativeInput, 'categoryName' | 'categorySlug' | 'counties'>) {
  if (!counties.length) return null;
  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold text-gray-900 mb-2">{categoryName} by Florida county</h2>
      <p className="text-sm text-gray-600 mb-4">Counts use each listing&apos;s county, limited to Florida. City links open this category in that city.</p>
      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-xl bg-white">
        {counties.map((county) => (
          <li key={county.county} className="p-4 sm:flex sm:items-start sm:justify-between gap-4">
            <div>
              <Link href={`/region/${countySlug(county.county)}`} className="font-semibold text-blue-800 hover:underline">
                {county.county} County
              </Link>
              <p className="text-sm text-gray-500">{county.count.toLocaleString('en-US')} {county.count === 1 ? 'pro' : 'pros'}</p>
            </div>
            {county.cities.length > 0 && (
              <p className="mt-2 sm:mt-0 text-sm text-gray-700 sm:text-right sm:max-w-md">
                {county.cities.map((city, i) => (
                  <span key={city.slug}>
                    {i > 0 && ' · '}
                    {shouldIndexCityPage(city.count) ? (
                      <Link href={`/services/${categorySlug}/${city.slug}`} className="text-blue-800 hover:underline">
                        {city.name} ({city.count.toLocaleString('en-US')})
                      </Link>
                    ) : (
                      <span className="text-gray-600">{city.name} ({city.count.toLocaleString('en-US')})</span>
                    )}
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryFaq(props: CategoryNarrativeInput) {
  const faqs = buildCategoryFaqs(props);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqs)) }} />
      <section className="mt-16 max-w-4xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{props.categoryName}: Frequently Asked Questions</h2>
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="p-5">
              <summary className="font-semibold text-gray-900 cursor-pointer">{f.q}</summary>
              <p className="mt-3 text-gray-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
