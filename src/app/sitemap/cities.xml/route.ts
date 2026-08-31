import { getCitiesSitemapUrls, renderUrlset, sitemapErrorResponse, sitemapResponse } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const xml = renderUrlset(await getCitiesSitemapUrls());
    return sitemapResponse(xml);
  } catch (error) {
    console.error('sitemap cities failed', error);
    return sitemapErrorResponse();
  }
}
