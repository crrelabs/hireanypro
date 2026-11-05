import assert from 'node:assert/strict';
import { formatListingProof, socialProofParts } from '../src/lib/social-proof-copy';

assert.equal(formatListingProof(27487), '27,000+');
assert.equal(formatListingProof(27000), '27,000+');
assert.equal(formatListingProof(27999), '27,000+');
assert.equal(formatListingProof(1000), '1,000+');
assert.equal(formatListingProof(999), '999');
assert.equal(formatListingProof(1), '1');
assert.equal(formatListingProof(0), null);
assert.equal(formatListingProof(-5), null);
assert.equal(formatListingProof(Number.NaN), null);

assert.deepEqual(
  socialProofParts({ claimed: 31, floridaListings: 27487, trades: 22 }),
  ['31 businesses claimed', '27,000+ Florida listings', '22 trades'],
);
assert.deepEqual(
  socialProofParts({ claimed: 1, floridaListings: 842, trades: 1 }),
  ['1 business claimed', '842 Florida listings', '1 trade'],
);
assert.deepEqual(socialProofParts({ claimed: 0, floridaListings: null, trades: null }), []);
assert.deepEqual(socialProofParts({ claimed: null, floridaListings: 0, trades: 0 }), []);
assert.deepEqual(
  socialProofParts({ claimed: null, floridaListings: 27487, trades: null }),
  ['27,000+ Florida listings'],
);

console.log('social-proof copy ok');
