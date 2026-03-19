import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — HireAnyPro',
  description: 'Choose the right plan for your business. Free listings, Pro, and Featured options available.',
  alternates: { canonical: 'https://hireanypro.com/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
