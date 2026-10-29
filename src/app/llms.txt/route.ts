import { supabase } from '@/lib/supabase';

export const revalidate = 86400;

// Plain-text site summary for AI assistants (llmstxt.org). Counts come live from the database.
export async function GET() {
  const [{ count: listingCount }, { data: cats }] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).not('slug', 'like', 'zz-hap-test%'),
    supabase.from('categories').select('name, slug').order('name'),
  ]);
  const n = (listingCount || 0).toLocaleString('en-US');
  const catLines = (cats || []).map((c) => `- [${c.name}](https://hireanypro.com/category/${c.slug})`).join('\n');
  const body = `# HireAnyPro

> HireAnyPro is a free directory of local service professionals across Florida (with the deepest coverage in Miami-Dade, Broward and Palm Beach), plus a few nearby Georgia and Alabama cities. It lists ${n} businesses across ${(cats || []).length} service categories, with public customer ratings, hours, service areas and contact details. Homeowners can request free quotes from up to 3 pros at once; there is no obligation to hire.

Key facts:
- Coverage: all of Florida, with the most listings in Miami-Dade and Broward counties.
- Free for homeowners. Businesses can claim their listing for free; optional paid plans are Pro ($9/month) and Featured ($49.99/month); see Pricing.
- Ratings shown are public customer ratings and review counts.
- Page pattern for a service in a city: https://hireanypro.com/services/{category}/{city} (e.g. https://hireanypro.com/services/plumbing/miami)

## Main pages
- [Home](https://hireanypro.com/)
- [All categories](https://hireanypro.com/categories)
- [Search pros](https://hireanypro.com/search)
- [About HireAnyPro](https://hireanypro.com/about)
- [Pricing for businesses](https://hireanypro.com/pricing)
- [Claim a listing](https://hireanypro.com/claim)
- [Blog](https://hireanypro.com/blog)

## Service categories
${catLines}

## Optional
- [Sitemap](https://hireanypro.com/sitemap.xml)
- [Contact](https://hireanypro.com/contact)
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
