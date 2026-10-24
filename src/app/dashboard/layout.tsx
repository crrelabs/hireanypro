import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Dashboard — HireAnyPro',
  description: 'Sign in to manage your HireAnyPro business listing, see quote requests and upgrade your plan.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
