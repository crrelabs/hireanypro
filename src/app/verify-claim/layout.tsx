import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Your Listing Claim — HireAnyPro',
  description: 'Confirm your email to finish claiming your free HireAnyPro business listing.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
