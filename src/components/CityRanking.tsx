import Link from 'next/link';
import { PRIOR_REVIEWS, rankingMonth, type RankedRow } from '@/lib/city-ranking';
import { listJoin } from '@/lib/directory-content';

type Props = {
  ranked: RankedRow[];
  label: string; // "plumbing pros", "moving companies"
  cityName: string;
  stateCode: string;
  totalReviews: number;
  count: number;
};

const fmt = (n: number) => n.toLocaleString('en-US');
const yes = (v: boolean) => (v ? 'Yes' : '—');

/** Answer-first ranked table. The summary sentence and the table come from the same ranked rows. */
export default function CityRanking({ ranked, label, cityName, stateCode, totalReviews, count }: Props) {
  if (ranked.length === 0) return null;
  const month = rankingMonth();
  const top3 = ranked.slice(0, 3).map((r) => `${r.name} (${r.rating.toFixed(1)} stars, ${fmt(r.reviewCount)} reviews)`);
  return (
    <section className="mb-10" aria-labelledby="city-ranking">
      <h2 id="city-ranking" className="text-xl font-bold text-gray-900 mb-2">
        Top {ranked.length} {label} in {cityName}, {stateCode}, ranked ({month})
      </h2>
      <p className="text-gray-700 mb-4 max-w-4xl">
        <strong>Quick answer:</strong> based on {fmt(totalReviews)} Google reviews across {fmt(count)} listings, the best-rated {label} in {cityName} right now are {listJoin(top3)}.
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <caption className="sr-only">{label} in {cityName} ranked by review-weighted rating</caption>
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-3 py-2">#</th>
              <th scope="col" className="px-3 py-2">Business</th>
              <th scope="col" className="px-3 py-2">Rating</th>
              <th scope="col" className="px-3 py-2">Reviews</th>
              <th scope="col" className="px-3 py-2 hidden sm:table-cell">Phone</th>
              <th scope="col" className="px-3 py-2 hidden sm:table-cell">Website</th>
              <th scope="col" className="px-3 py-2 hidden md:table-cell">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranked.map((r) => (
              <tr key={r.slug}>
                <td className="px-3 py-2 font-semibold text-gray-900">{r.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/listing/${r.slug}`} className="text-blue-800 font-medium hover:underline">{r.name}</Link>
                  {r.claimed && <span className="ml-2 text-xs text-green-700">Claimed by owner</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.rating.toFixed(1)} ★</td>
                <td className="px-3 py-2">{fmt(r.reviewCount)}</td>
                <td className="px-3 py-2 hidden sm:table-cell">{yes(r.hasPhone)}</td>
                <td className="px-3 py-2 hidden sm:table-cell">{yes(r.hasWebsite)}</td>
                <td className="px-3 py-2 hidden md:table-cell">{r.hasHours ? (r.weekend ? 'Incl. weekends' : 'Weekdays') : 'Not listed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2 max-w-4xl">
        How we rank: each pro&apos;s Google star rating is weighted by how many reviews back it up (a Bayesian average that starts every pro at the {cityName} average and needs about {PRIOR_REVIEWS} reviews to move far from it), so a perfect score from a handful of reviews does not outrank a 4.9 from hundreds. Paid plans never change this ranking. Data updated {month}.
      </p>
    </section>
  );
}
