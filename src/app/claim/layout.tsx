import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Claim Your Business Listing — HireAnyPro',
  description: 'Claim your free HireAnyPro listing to manage your business profile, see customer quote requests and get more leads in Florida.',
  // Indexable so owners searching for their business can find the claim page (was noindex,nofollow: "unknown to Google").
  alternates: { canonical: 'https://hireanypro.com/claim' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
