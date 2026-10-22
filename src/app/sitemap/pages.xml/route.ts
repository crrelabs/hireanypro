import { getPagesSitemapUrls, renderUrlset, sitemapErrorResponse, sitemapResponse } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const xml = renderUrlset(await getPagesSitemapUrls());
    return sitemapResponse(xml);
  } catch (error) {
    console.error('sitemap pages failed', error);
    return sitemapErrorResponse();
  }
}
