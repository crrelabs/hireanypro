import type { NextConfig } from "next";
import TRADE_ALIASES from "./src/data/trade-aliases.json";

// Statically generated trade pages (dynamicParams=false) cannot redirect from page code, so alias slugs
// (/data/.../solar, /costs/plumbers) are redirected here. Dynamic routes handle aliases in the page (src/lib/slug-aliases.ts).
const aliasRedirects = Object.entries(TRADE_ALIASES as Record<string, string>).flatMap(([alias, slug]) => [
  { source: `/data/florida-contractor-ratings-2026/${alias}`, destination: `/data/florida-contractor-ratings-2026/${slug}`, permanent: true },
  { source: `/costs/${alias}`, destination: `/costs/${slug}`, permanent: true },
]);

const nextConfig: NextConfig = {
  trailingSlash: false,
  async redirects() {
    return [
      // Bare section paths (people trim URLs; /listing got real visits) had no index page and returned 404.
      { source: '/listing', destination: '/categories', permanent: true },
      { source: '/category', destination: '/categories', permanent: true },
      { source: '/services', destination: '/categories', permanent: true },
      { source: '/region', destination: '/categories', permanent: true },
      // Common guessed URLs that 404'd in the Nov 2 request logs.
      { source: '/about-us', destination: '/about', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      // ES/PT spellings that 404'd in the Nov 5 request logs.
      { source: '/contacto', destination: '/contact', permanent: true },
      { source: '/contactos', destination: '/contact', permanent: true },
      { source: '/contato', destination: '/contact', permanent: true },
      { source: '/get-quotes', destination: '/', permanent: true },
      { source: '/quotes', destination: '/', permanent: true },
      { source: '/quote', destination: '/', permanent: true },
      { source: '/category/pet-services', destination: '/categories', permanent: false },
      { source: '/services/pet-services/:city', destination: '/categories', permanent: false },
      { source: '/sitemaps.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/sitemaps/:path*', destination: '/sitemap/:path*', permanent: true },
      { source: '/data', destination: '/data/florida-contractor-ratings-2026', permanent: true },
      { source: '/guides', destination: '/guides/florida-contractor-license-check', permanent: false },
      { source: '/services/:category', destination: '/category/:category', permanent: true },
      // Truncated links seen in the Nov 3 request logs (cut off in emails and chat answers).
      { source: '/data/:p(florida-(?!contractor-ratings-2026$)[a-z0-9-]*)', destination: '/data/florida-contractor-ratings-2026', permanent: false },
      { source: '/guides/:p(florida-(?!contractor-license-check$)[a-z0-9-]*)', destination: '/guides/florida-contractor-license-check', permanent: false },
      { source: '/cost', destination: '/costs', permanent: true },
      { source: '/prices', destination: '/costs', permanent: true },
      ...aliasRedirects,
      {
        // Deleted duplicate listing (2026-10-24)
        source: '/listing/zz-garage-doors-and-repair-haines-city',
        destination: '/listing/zz-garage-doors-and-repair',
        permanent: true,
      },
      {
        // Redirect old /[category]/[city] to /services/[category]/[city]
        source: '/:category(plumbing|electrical|hvac|roofing|painting|landscaping|cleaning|pest-control|flooring|general-contractor|locksmith|pool-service|garage-door|handyman|fencing|moving-companies|solar-installation|window-cleaning|carpet-cleaning|tree-service|security-alarm|appliance-repair)/:city',
        destination: '/services/:category/:city',
        permanent: true, // 301
      },
    ];
  },
};

export default nextConfig;
