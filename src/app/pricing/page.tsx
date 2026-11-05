import PricingClient from './PricingClient';
import { readSocialProof } from '@/lib/social-proof';

export const revalidate = 3600;

export default async function PricingPage() {
  const proof = await readSocialProof();
  return <PricingClient proof={proof} />;
}
