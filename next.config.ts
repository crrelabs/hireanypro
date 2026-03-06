import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
