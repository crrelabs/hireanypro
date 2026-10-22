import { getSitemapIndexEntries, renderSitemapIndex, sitemapErrorResponse, sitemapResponse } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const xml = renderSitemapIndex(await getSitemapIndexEntries());
    return sitemapResponse(xml);
  } catch (error) {
    console.error('sitemap index failed', error);
    return sitemapErrorResponse();
  }
}
