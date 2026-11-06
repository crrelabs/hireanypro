import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  claimViewsSentence,
  dashboardViewsNudge,
  readClaimViews,
  withViewsCmp,
} from '../src/lib/claim-views-ui';
import { pricingCampaign } from '../src/lib/pricing-campaign';

assert.equal(readClaimViews(null), null);
assert.equal(readClaimViews({}), null);
assert.equal(readClaimViews({ views30: 0 }), null);
assert.equal(readClaimViews({ views30: 1 }), null);
assert.equal(readClaimViews({ views30: 2 }), 2);
assert.equal(readClaimViews({ views30: 2.5 }), null);
assert.equal(readClaimViews({ views30: '4' }), null);
assert.equal(claimViewsSentence(2), '2 people viewed your listing in the last 30 days.');
assert.equal(claimViewsSentence(1), '1 person viewed your listing in the last 30 days.');

assert.equal(withViewsCmp('post_claim', null), 'post_claim');
assert.equal(withViewsCmp('post_claim_rank', null), 'post_claim_rank');
assert.equal(withViewsCmp('post_claim', 2), 'post_claim_views');
assert.equal(withViewsCmp('post_claim_rank', 9), 'post_claim_rank_views');
assert.equal(withViewsCmp('listing_one_tap', 2), 'listing_one_tap_views');
assert.equal(withViewsCmp('listing_one_tap_rank', 4), 'listing_one_tap_rank_views');
assert.equal(withViewsCmp('post_claim_views', 3), 'post_claim_views');

assert.equal(dashboardViewsNudge(2, 'free'), null);
assert.equal(dashboardViewsNudge(3, 'pro'), null);
assert.equal(dashboardViewsNudge(3, 'featured'), null);
assert.equal(dashboardViewsNudge(undefined, 'free'), null);
assert.equal(
  dashboardViewsNudge(3, 'free'),
  '3 people viewed your listing in the last 30 days. Free listings hide your phone and website.',
);

const camp = pricingCampaign('?plan=pro&listing=abc&src=claim_success&cmp=post_claim_views&utm_source=email&utm_campaign=x');
assert.deepEqual(camp, { src: 'claim_success', cmp: 'post_claim_views' });
assert.deepEqual(pricingCampaign(''), {});
assert.equal('utm_source' in camp, false);

const claimRoute = readFileSync(new URL('../src/app/api/claim/route.ts', import.meta.url), 'utf8');
const verifyRoute = readFileSync(new URL('../src/app/api/verify-claim/route.ts', import.meta.url), 'utf8');
assert.match(claimRoute, /viewCount\(listing\.id, 30, supabase\)/);
assert.match(verifyRoute, /viewCount\(claim\.listing_id, 30, supabase\)/);
for (const file of ['src/app/claim/ClaimForm.tsx', 'src/components/OwnerClaim.tsx', 'src/app/verify-claim/page.tsx', 'src/app/dashboard/page.tsx']) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.doesNotMatch(src, /listing-views/);
  assert.doesNotMatch(src, /@supabase\/supabase-js/);
}
for (const file of ['src/app/claim/ClaimForm.tsx', 'src/app/verify-claim/page.tsx', 'src/app/dashboard/page.tsx']) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.doesNotMatch(src, /utm_/);
}
const owner = readFileSync(new URL('../src/components/OwnerClaim.tsx', import.meta.url), 'utf8');
assert.match(owner, /src=claim_success&cmp=\$\{withViewsCmp/);
const dash = readFileSync(new URL('../src/app/dashboard/page.tsx', import.meta.url), 'utf8');
assert.match(dash, /src=dashboard&cmp=views_nudge/);
assert.match(dash, /dashboardViewsNudge/);

console.log('claim views checks passed');
