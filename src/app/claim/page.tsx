import ClaimForm from './ClaimForm';
import { ClaimBenefits, ClaimIntro, ClaimTrust } from './claim-content';
import { getClaimedBusinessCount } from '@/lib/claimed-count';

export const revalidate = 3600;

export default async function ClaimPage() {
  const claimedCount = await getClaimedBusinessCount();
  return (
    <ClaimForm
      intro={<ClaimIntro />}
      benefits={<ClaimBenefits />}
      benefitsAfter={<ClaimBenefits after />}
      trust={<ClaimTrust claimedCount={claimedCount} />}
    />
  );
}
