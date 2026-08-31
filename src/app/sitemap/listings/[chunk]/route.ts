import {
  getListingChunkUrls,
  parseListingChunk,
  renderUrlset,
  sitemapErrorResponse,
  sitemapResponse,
} from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

type Props = { params: Promise<{ chunk: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { chunk: raw } = await params;
    const chunk = parseListingChunk(raw);
    if (chunk == null) {
      return new Response('Not found', { status: 404 });
    }

    const urls = await getListingChunkUrls(chunk);
    if (urls.length === 0 && chunk !== 0) {
      return new Response('Not found', { status: 404 });
    }

    return sitemapResponse(renderUrlset(urls));
  } catch (error) {
    console.error('sitemap listings chunk failed', error);
    return sitemapErrorResponse();
  }
}
