import type { NextConfig } from "next";

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
      { source: '/data', destination: '/data/florida-contractor-ratings-2026', permanent: true },
      { source: '/guides', destination: '/guides/florida-contractor-license-check', permanent: false },
      { source: '/services/:category', destination: '/category/:category', permanent: true },
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
