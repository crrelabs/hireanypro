import Link from 'next/link';
import {
  buildListingMarketParagraphs,
  listingMarketLinks,
  type RankedPro,
  type TextPart,
} from '@/lib/directory-content';
import type { DayHours } from '@/lib/hours';

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

export default function ListingMarketContext(props: {
  name: string;
  categoryName: string;
  categorySlug: string;
  cityName: string;
  citySlug: string;
  stateCode: string;
  stateName: string;
  county: string | null;
  zip: string | null;
  hours: Record<string, DayHours> | null;
  count: number;
  rated: number;
  avg: number;
  totalReviews: number;
  peers: RankedPro[];
}) {
  const paragraphs = buildListingMarketParagraphs(props);
  const links = listingMarketLinks(props);
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{props.categoryName} in {props.cityName}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">
        {paragraphs.map((parts, i) => (
          <p key={i}><Parts parts={parts} /></p>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-blue-800 hover:underline font-medium text-sm">{link.label} →</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
