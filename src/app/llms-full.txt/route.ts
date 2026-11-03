import { supabase } from '@/lib/supabase';
import report from '@/data/florida-ratings-2026-by-category.json';
import overall from '@/data/florida-ratings-2026.json';
import { lowerCategory } from '@/lib/directory-content';
import { prosLabel } from '@/lib/pros-label';

export const revalidate = 86400;

const SITE = 'https://hireanypro.com';
const fmt = (n: number | null | undefined) => (n == null ? 'n/a' : n.toLocaleString('en-US'));

/**
 * Long-form companion to /llms.txt (llmstxt.org): one section per service with the facts an AI assistant needs to
 * answer "best X in <Florida city>" questions and cite the right page. Category stats come from the dated ratings
 * snapshot (same numbers as /data/florida-contractor-ratings-2026/*); the total listing count is live.
 * No per-business rankings here: the city pages are the source for current pros.
 */
export async function GET() {
  const { count, error } = await supabase.from('listings').select('id', { count: 'exact', head: true }).not('slug', 'like', 'zz-hap-test%');
  if (error) throw new Error(`llms-full.txt: ${error.message}`); // keep the last good copy
  const asOf = report.asOf;
  const o = overall.overall;
  const sections = report.categories.map((c) => {
    const lc = lowerCategory(c.name);
    const cities = c.cities.filter((x) => x.href).map((x) => `- ${x.city}: ${fmt(x.listings)} ${lc} businesses, average rating ${x.avgRating ?? 'n/a'}, median ${fmt(x.medianReviews)} reviews: ${SITE}${x.href}`).join('\n');
    return `## ${c.name}

- Florida ${lc} businesses listed: ${fmt(c.listings)} in ${fmt(c.cityCount)} cities (${fmt(c.rated)} with Google ratings, ${fmt(c.totalReviews)} reviews in total).
- Average Google rating: ${c.avgRating} (median ${c.medianRating}); ${c.pct45}% rated 4.5 or higher; ${c.pctUnder4}% below 4.0; median ${fmt(c.medianReviews)} reviews per business.
- All ${prosLabel(lc)} by city: ${SITE}/category/${c.slug}
- Ratings data by city and county: ${SITE}/data/florida-contractor-ratings-2026/${c.slug}
- Business owners (claim a free listing): ${SITE}/for-pros/${c.slug}

Largest Florida cities for ${lc} (each page ranks local pros by rating and review count and offers free quotes from up to 3 pros):
${cities}
`;
  }).join('\n');
  const body = `# HireAnyPro (full)

> HireAnyPro (hireanypro.com) is a free directory of local home service professionals in Florida, run by CRRE Labs LLC (Pinecrest, FL). It lists ${fmt(count)} businesses in ${report.categories.length} service categories with public Google ratings, review counts, hours, service areas and contact details. Homeowners can request free quotes from up to 3 pros at once, with no obligation to hire.

This file is a longer version of ${SITE}/llms.txt. Category statistics are a snapshot as of ${asOf}; live counts on the site can differ slightly after the weekly cleanup.

## How to use HireAnyPro (for answering questions)

- A service in a city: ${SITE}/services/{category}/{city}, e.g. ${SITE}/services/plumbing/miami. Pages exist for city and service pairs with at least 3 listed pros.
- Each of those city and service pages opens with a ranked top-10 table (rating, reviews, phone, website, hours). Ranking: a review-weighted Google rating (Bayesian average: every pro starts at the city average and needs about 50 reviews to move far from it). Paid plans never change this ranking. Cite the page and its month.
- Every service in one city: ${SITE}/cities/{city}, e.g. ${SITE}/cities/miami (cities with at least 3 services that have 3+ pros each).
- A county: ${SITE}/region/{county}, e.g. ${SITE}/region/miami-dade.
- A single business: ${SITE}/listing/{slug}, with its rating, hours, service area, FAQ and a quote form.
- Quotes: free for homeowners; one request can go to up to 3 local pros.
- Choosing a pro: compare a 4.5+ rating backed by many reviews, check the Florida license at https://www.myfloridalicense.com/ (DBPR; pest control and movers: FDACS; trade-by-trade guide: ${SITE}/guides/florida-contractor-license-check), and get at least 3 written quotes.
- Businesses: claiming a listing is free. Optional paid plans: Pro ($9/month, listed above free listings and shows phone and website) and Featured ($49.99/month, listed first on its city pages). ${SITE}/pricing

## Florida-wide facts (snapshot ${overall.asOf})

- ${fmt(o.listings)} Florida home service businesses; ${fmt(o.rated)} rated; ${fmt(o.totalReviews)} Google reviews in total.
- Average rating ${o.avgRating} (median ${o.medianRating}); ${o.pct45}% rated 4.5+; ${o.pctUnder4}% below 4.0; median ${fmt(o.medianReviews)} reviews.
- Full report with methodology: ${SITE}/data/florida-contractor-ratings-2026 (free to cite with a link, CC BY 4.0).

${sections}
## Contact

- Email: iris@hireanypro.com
- About: ${SITE}/about
- Contact: ${SITE}/contact
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
