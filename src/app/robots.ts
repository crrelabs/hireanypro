import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Don't block /_next/: Google needs our JS/CSS chunks to render pages properly.
        disallow: ['/api/', '/dashboard', '/verify-claim'],
      },
    ],
    sitemap: 'https://hireanypro.com/sitemap.xml',
  };
}
