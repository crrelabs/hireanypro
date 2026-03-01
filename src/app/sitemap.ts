import { supabase } from '@/lib/supabase';
import { getAllBlogSlugs } from '@/lib/blog';
import { getAllCounties, countySlug, citySlug } from '@/lib/geo';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://hireanypro.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all data in parallel
  const [{ data: categories }, blogSlugs] = await Promise.all([
    supabase.from('categories').select('slug'),
    getAllBlogSlugs(),
  ]);

  // Fetch all listings (paginated since >1000)
  const allListings: { slug: string; city: string; category_id: string; updated_at: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('listings')
      .select('slug, city, category_id, updated_at')
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allListings.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // Get category slug map
  const { data: catRows } = await supabase.from('categories').select('id, slug');
  const catIdToSlug = new Map((catRows || []).map(c => [c.id, c.slug]));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Listing pages
  const listingPages: MetadataRoute.Sitemap = allListings.map((l) => ({
    url: `${BASE_URL}/listing/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${BASE_URL}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // City landing pages (distinct category+city combos)
  const cityComboSet = new Set<string>();
  for (const l of allListings) {
    if (l.city && l.category_id) {
      const catS = catIdToSlug.get(l.category_id);
      if (catS) cityComboSet.add(`${catS}/${citySlug(l.city)}`);
    }
  }
  const cityPages: MetadataRoute.Sitemap = [...cityComboSet].map((combo) => ({
    url: `${BASE_URL}/services/${combo}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // County/region pages
  const countyPages: MetadataRoute.Sitemap = getAllCounties().map((county) => ({
    url: `${BASE_URL}/region/${countySlug(county)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Blog pages
  const blogPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    ...blogSlugs.map((b) => ({
      url: `${BASE_URL}/blog/${b.slug}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  return [...staticPages, ...listingPages, ...categoryPages, ...cityPages, ...countyPages, ...blogPages];
}
