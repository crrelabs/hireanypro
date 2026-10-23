import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing for Pros: Free, Pro $9/mo, Featured $49.99/mo — HireAnyPro',
  description: 'Get more Florida customers. List your business free, or upgrade to Pro ($9/mo) or Featured ($49.99/mo) for direct leads, a verified badge and top placement.',
  alternates: { canonical: 'https://hireanypro.com/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
