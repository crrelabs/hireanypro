import Link from 'next/link';
import { costGuide, costPath, costRange } from '@/lib/cost-guides';

/** "Typical cost in Florida" answer line linking to the trade's cost guide. Renders nothing when no guide exists. */
export default function CostLine({ categorySlug, cityName, cityCostHref }: {
  categorySlug: string;
  /** Set only when /costs/<trade>/<city> exists for this page's city. */
  cityName?: string;
  cityCostHref?: string;
}) {
  const g = costGuide(categorySlug);
  if (!g) return null;
  const others = g.jobs.filter((j) => j.job !== g.headline.job).slice(0, 2);
  return (
    <section className="my-6 rounded-xl border border-green-200 bg-green-50 p-4" aria-label={`Typical ${g.noun} cost`}>
      <p className="text-sm text-gray-800">
        <strong>Typical cost in Florida:</strong> {g.headline.job} usually runs <strong>{costRange(g.headline)}</strong> (2026 estimate)
        {others.length > 0 && <>; {others.map((j) => `${j.job.charAt(0).toLowerCase()}${j.job.slice(1)} ${costRange(j)}`).join('; ')}</>}.{' '}
        <Link href={costPath(g.slug)} className="font-medium text-blue-700 hover:underline">Full Florida {g.title} cost guide</Link>
        {cityCostHref && cityName && (
          <>
            {' · '}
            <Link href={cityCostHref} className="font-medium text-blue-700 hover:underline">{`${g.title} cost in ${cityName}`}</Link>
          </>
        )}
      </p>
    </section>
  );
}
