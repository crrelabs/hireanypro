export const revalidate = 86400;

// /ai.txt: AI crawlers probe it (404 in the Nov 3 logs). Mirrors robots.txt policy: public pages may be used and
// cited with a link; points to the llms.txt summaries. No private areas are listed (they are disallowed in robots.txt).
export function GET() {
  const body = `# ai.txt for hireanypro.com
# Public directory pages, data reports, guides and cost guides may be read, summarized and cited by AI assistants.
# Please link the page you cite. Data reports are CC BY 4.0.
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /verify-claim

# Summaries for AI assistants:
# https://hireanypro.com/llms.txt
# https://hireanypro.com/llms-full.txt
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
