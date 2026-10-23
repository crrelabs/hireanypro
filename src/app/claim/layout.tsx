import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Claim Your Business Listing — HireAnyPro',
  description: 'Claim your free HireAnyPro listing to manage your business profile, see customer quote requests and get more leads in Florida.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
