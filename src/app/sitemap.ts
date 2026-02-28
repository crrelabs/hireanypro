import { supabase } from '@/lib/supabase';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://hireanypro.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: listings }, { data: categories }] = await Promise.all([
    supabase.from('listings').select('slug, updated_at'),
    supabase.from('categories').select('slug'),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const listingPages: MetadataRoute.Sitemap = (listings || []).map((l) => ({
    url: `${BASE_URL}/listing/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${BASE_URL}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...listingPages, ...categoryPages];
}
