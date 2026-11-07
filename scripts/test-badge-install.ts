import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BadgeBox from '../src/app/dashboard/BadgeBox';
import BadgeClaimCta from '../src/components/BadgeClaimCta';

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const badge = read('src/app/dashboard/BadgeBox.tsx');
assert.match(badge, /import \{ track \} from '@\/lib\/track'/);
assert.match(badge, /track\('badge_copy', \{ listing_slug: slug \}\)/);
assert.match(badge, /WordPress: Appearance → Widgets\/Custom HTML, or a Custom HTML block/);
assert.match(badge, /Wix: Add → Embed → Embed Code/);
assert.match(badge, /Squarespace: Add Code Block/);
assert.match(badge, /paste before \{'<\/body>'\} in your theme/);
assert.match(badge, /Paste it on your site, then refresh this dashboard in a day to confirm\./);
assert.match(badge, /Copied ✓/);
assert.doesNotMatch(badge, /<a\s/);
assert.doesNotMatch(badge, /utm_/);
assert.doesNotMatch(badge.toLowerCase(), /free trial|money-back|money back/);

const cta = read('src/components/BadgeClaimCta.tsx');
assert.match(cta, /import \{ onHuman, track \} from '@\/lib\/track'/);
assert.match(cta, /onHuman\(/);
assert.match(cta, /badge_claim_cta_view/);
assert.match(cta, /badge_claim_cta_click/);
assert.match(cta, /href="\/dashboard\?src=claim_success&cmp=badge_cta"/);
assert.doesNotMatch(cta, /utm_/);
assert.doesNotMatch(cta, /mailto:/);
assert.doesNotMatch(cta.toLowerCase(), /free trial|money-back|money back/);
assert.match(cta, /Add a HireAnyPro badge to your website →/);

for (const file of ['src/app/claim/ClaimForm.tsx', 'src/components/OwnerClaim.tsx']) {
  const src = read(file);
  const finish = src.indexOf('Finish my listing');
  const ctaUse = src.indexOf('<BadgeClaimCta');
  assert.ok(finish !== -1 && ctaUse !== -1 && finish < ctaUse, `${file} should place the badge link after Finish my listing`);
  assert.match(src, /from '@\/lib\/track'/);
  assert.doesNotMatch(src, /sendClaim|sendEmail|resend/i);
}

const claimForm = read('src/app/claim/ClaimForm.tsx');
assert.doesNotMatch(claimForm, /utm_/);
const upgrade = claimForm.indexOf('Optional upgrade');
assert.ok(claimForm.indexOf('<BadgeClaimCta') < upgrade, 'badge link stays above the Pro upgrade card');

const dash = read('src/app/dashboard/page.tsx');
assert.match(dash, /searchParams\.get\('src'\) === 'claim_success' && searchParams\.get\('cmp'\) === 'badge_cta'/);
assert.match(dash, /bannerReady && badgeCtaTargetId === l\.id \? 1 : 0/);
assert.doesNotMatch(dash, /utm_/);
assert.doesNotMatch(dash.slice(dash.indexOf('fromBadgeCta'), dash.indexOf('function openBadge')), /badge_banner_click/);

const claimRoute = read('src/app/api/claim/route.ts');
assert.match(claimRoute, /sendClaimVerification/);
assert.doesNotMatch(claimRoute, /badge_cta|badge_copy/);

const openHtml = renderToStaticMarkup(createElement(BadgeBox, { slug: 'acme-plumbing', name: 'Acme Plumbing', defaultOpen: true }));
assert.match(openHtml, /WordPress: Appearance → Widgets\/Custom HTML, or a Custom HTML block/);
assert.match(openHtml, /Wix: Add → Embed → Embed Code/);
assert.match(openHtml, /Squarespace: Add Code Block/);
assert.match(openHtml, /&lt;\/body&gt;/);
assert.match(openHtml, /Copy code/);
assert.match(openHtml, /\/api\/badge\/acme-plumbing/);
assert.doesNotMatch(openHtml, /Paste it on your site/);
assert.doesNotMatch(openHtml, /<a[\s>]/);

const closedHtml = renderToStaticMarkup(createElement(BadgeBox, { slug: 'acme-plumbing', name: 'Acme Plumbing' }));
assert.match(closedHtml, /Add a/);
assert.doesNotMatch(closedHtml, /Squarespace/);

const ctaHtml = renderToStaticMarkup(createElement(BadgeClaimCta, { listingSlug: 'acme-plumbing' }));
assert.match(ctaHtml, /href="\/dashboard\?src=claim_success&amp;cmp=badge_cta"/);
assert.match(ctaHtml, /Add a HireAnyPro badge to your website →/);
assert.doesNotMatch(ctaHtml, /utm_/);

console.log('badge install checks passed');
