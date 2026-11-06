import ClaimForm from './ClaimForm';
import { ClaimBenefits, ClaimFaq, ClaimIntro, ClaimTrust } from './claim-content';
import SocialProofStrip from '@/components/SocialProofStrip';
import { getClaimedBusinessCount } from '@/lib/claimed-count';
import { readSocialProof } from '@/lib/social-proof';

export const revalidate = 3600;

export default async function ClaimPage() {
  const [claimedCount, proof] = await Promise.all([
    getClaimedBusinessCount(),
    readSocialProof(),
  ]);
  return (
    <ClaimForm
      intro={<ClaimIntro />}
      benefits={<ClaimBenefits />}
      benefitsAfter={<ClaimBenefits after />}
      proof={<SocialProofStrip surface="claim" stats={proof} className="-mt-4 mb-8" />}
      trust={<ClaimTrust claimedCount={claimedCount} />}
      faq={<ClaimFaq />}
    />
  );
}
