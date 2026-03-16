import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/search?', '/claim', '/dashboard/', '/verify-claim'],
      },
    ],
    sitemap: 'https://hireanypro.com/sitemap.xml',
  };
}
