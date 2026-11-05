import { costRange, type CostJob } from '@/lib/cost-guides';

/** Typical-price table shared by the Florida guide and city cost pages. Numbers come only from the guide. */
export default function CostJobsTable({ jobs }: { jobs: CostJob[] }) {
  const td = 'p-3 align-top';
  return (
    <div className="overflow-x-auto mb-8">
      <table className="w-full text-sm border border-gray-200 rounded-lg">
        <thead className="bg-gray-50 text-left"><tr><th className="p-3">Job</th><th className="p-3">Typical price</th></tr></thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.job} className="border-t border-gray-100">
              <td className={td}>{j.job}{j.note && <span className="block text-xs text-gray-500 mt-0.5">{j.note}</span>}</td>
              <td className={`${td} font-medium whitespace-nowrap`}>{costRange(j)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
