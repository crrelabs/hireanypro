import type { MetadataRoute } from 'next';

// '/search?': internal search result pages are noindex and endless (thousands of ?page= URLs); keep crawlers on the sitemap pages.
// '/claim?', '/pricing?', '/for-pros?': per-listing claim/plan links (one per listing page) were ~13% of all crawler
// requests on 2026-11-01. The plain /claim, /pricing and /for-pros pages stay crawlable.
const disallow = ['/api/', '/dashboard', '/verify-claim', '/search?', '/claim?', '/pricing?', '/for-pros?'];
// Search and AI answer engines we explicitly welcome (ChatGPT, Claude, Perplexity, Gemini, Bing).
const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Bingbot', 'Applebot', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Don't block /_next/: Google needs our JS/CSS chunks to render pages properly.
      { userAgent: '*', allow: '/', disallow },
      { userAgent: aiBots, allow: '/', disallow },
    ],
    sitemap: 'https://hireanypro.com/sitemap.xml',
  };
}
