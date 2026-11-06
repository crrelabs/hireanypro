import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import robots from '../src/app/robots';

// Plain /claim stays crawlable. Query-string claim links (/claim?) stay disallowed so per-listing URLs do not eat the crawl.
const rules = robots().rules;
const list = Array.isArray(rules) ? rules : [rules];
assert.ok(list.length >= 1);
for (const rule of list) {
  const raw = rule.disallow ?? [];
  const disallow = Array.isArray(raw) ? raw : [raw];
  assert.equal(disallow.includes('/claim'), false);
  assert.equal(disallow.includes('/claim?'), true);
}

const layout = readFileSync(new URL('../src/app/claim/layout.tsx', import.meta.url), 'utf8');
const layoutCode = layout.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
assert.doesNotMatch(layoutCode, /noindex/);
assert.doesNotMatch(layoutCode, /robots\s*:/);
assert.match(layout, /https:\/\/hireanypro.com\/claim/);

const intro = readFileSync(new URL('../src/app/claim/claim-content.tsx', import.meta.url), 'utf8');
const form = readFileSync(new URL('../src/app/claim/ClaimForm.tsx', import.meta.url), 'utf8');
assert.match(intro, /href="#faq"/);
assert.match(form, /href="#faq"/);
// ClaimForm must not import the server FAQ module; that module pulls JSON-LD helpers into the client graph.
assert.doesNotMatch(form, /claim-content/);

console.log('claim index checks passed');
