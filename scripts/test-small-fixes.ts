import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blogToc, stripDuplicateTitle } from '../src/lib/blog-markdown';
import { claimFaqJsonLd, claimFaqs } from '../src/lib/claim-faq';
import { businessNoun, forProsDocumentTitle } from '../src/lib/for-pros';
import { jsonLdHtml } from '../src/lib/json-ld';
import { categoryDocumentTitle, clampTitle, dataCategoryTitle } from '../src/lib/meta';
import TRADE_ALIASES from '../src/data/trade-aliases.json';

const TRADES: [string, string][] = [
  ['general-contractor', 'General Contractor'],
  ['roofing', 'Roofing'],
  ['hvac', 'HVAC'],
  ['plumbing', 'Plumbing'],
  ['landscaping', 'Landscaping'],
  ['electrical', 'Electrical'],
  ['moving-companies', 'Moving Companies'],
  ['flooring', 'Flooring'],
  ['pool-service', 'Pool Service'],
  ['pest-control', 'Pest Control'],
  ['painting', 'Painting'],
  ['tree-service', 'Tree Service'],
  ['cleaning', 'Cleaning'],
  ['handyman', 'Handyman'],
  ['carpet-cleaning', 'Carpet Cleaning'],
  ['locksmith', 'Locksmith'],
  ['appliance-repair', 'Appliance Repair'],
  ['fencing', 'Fencing'],
  ['garage-door', 'Garage Door'],
  ['solar-installation', 'Solar Installation'],
  ['security-alarm', 'Security & Alarm'],
  ['window-cleaning', 'Window Cleaning'],
];

for (const [slug, name] of TRADES) {
  for (const total of ['12', '1,234', '99,999']) {
    const title = categoryDocumentTitle(name, total);
    assert.ok(title.length <= 65, `${title} (${title.length})`);
  }
  const pros = forProsDocumentTitle(name, slug);
  assert.ok(pros.length <= 65, `${pros} (${pros.length})`);
  const data = dataCategoryTitle(name);
  assert.ok(data.length <= 65, `${data} (${data.length})`);
}

assert.match(categoryDocumentTitle('Plumbing', '100'), /\| HireAnyPro$/);
assert.doesNotMatch(categoryDocumentTitle('General Contractor', '1,234'), /\| HireAnyPro$/);
assert.doesNotMatch(categoryDocumentTitle('Solar Installation', '800'), /\| HireAnyPro$/);
assert.match(forProsDocumentTitle('Plumbing', 'plumbing'), /\| HireAnyPro for Pros$/);
assert.equal(forProsDocumentTitle('Plumbing', 'plumbing').length, 65);
assert.equal(forProsDocumentTitle('Moving Companies', 'moving-companies'), 'List Your Moving Company Business Free in Florida');
assert.doesNotMatch(forProsDocumentTitle('Solar Installation', 'solar-installation'), /\|/);
assert.doesNotMatch(forProsDocumentTitle('General Contractor', 'general-contractor'), /\|/);
assert.equal(businessNoun('moving-companies', 'Moving Companies'), 'moving company');
assert.equal(businessNoun('plumbing', 'Plumbing'), 'plumbing');
assert.equal(businessNoun('hvac', 'HVAC'), 'HVAC');

assert.equal(dataCategoryTitle('Plumbing'), 'Florida Plumbing Ratings and Reviews by City (2026 Data)');
assert.equal(dataCategoryTitle('General Contractor'), 'Florida General Contractor Ratings by City (2026 Data)');
assert.equal(dataCategoryTitle('Solar Installation'), 'Florida Solar Installation Ratings by City (2026 Data)');
assert.ok(dataCategoryTitle('General Contractor').length <= 65);
assert.ok(dataCategoryTitle('Solar Installation').length <= 65);

const long = 'How to Choose a Florida Roofing Contractor When Your Insurance Claim Gets Complicated This Year';
assert.ok(long.length > 65);
const clamped = clampTitle(long);
assert.ok(clamped.length <= 65, `${clamped} (${clamped.length})`);
assert.ok(clamped.endsWith('…'));
assert.equal(clampTitle('Short title'), 'Short title');
assert.ok(clampTitle('x'.repeat(90)).length <= 65);

function blogTitle(title: string) {
  return clampTitle(title.length > 46 ? title : `${title} | HireAnyPro Blog`);
}
assert.ok(blogTitle('A'.repeat(93)).length <= 65);
assert.match(blogTitle('Roof repair tips'), /\| HireAnyPro Blog$/);

const post = '# Roof Repair Tips\n\nIntro line.\n\n## Materials\n\nText.\n\n### Underlayment\n\nMore.\n';
assert.equal(stripDuplicateTitle(post, 'Roof Repair Tips'), 'Intro line.\n\n## Materials\n\nText.\n\n### Underlayment\n\nMore.\n');
assert.deepEqual(blogToc(post, 'Roof Repair Tips').map((i) => i.text), ['Materials', 'Underlayment']);
const kept = '# A Different Heading\n\n## Materials\n';
assert.match(stripDuplicateTitle(kept, 'Roof Repair Tips'), /^# A Different Heading/);
assert.equal(blogToc(kept, 'Roof Repair Tips')[0].level, 2);

const aliases = TRADE_ALIASES as Record<string, string>;
assert.equal(aliases['pool-maintenance'], 'pool-service');
assert.equal(aliases.maintenance, 'handyman');
for (const lawn of ['lawn-maintenance', 'yard-maintenance', 'grass-cutting', 'lawn-service', 'lawn-services', 'lawn-care', 'yard-work', 'yard-service']) {
  assert.equal(aliases[lawn], 'landscaping', lawn);
}
assert.equal(aliases['window-washing'], 'window-cleaning');
assert.equal(aliases['window-washers'], 'window-cleaning');
for (const pw of ['pressure-washing', 'pressurewashing', 'power-washing', 'powerwashing']) {
  assert.equal(aliases[pw], 'cleaning', pw);
}

const dotted = 'hello-floors-st-pete-st.-petersburg';
assert.equal(dotted.replace(/st\.-/g, 'st-'), 'hello-floors-st-pete-st-petersburg');

const claimLd = claimFaqJsonLd();
assert.equal(claimLd['@type'], 'FAQPage');
assert.deepEqual(claimLd.mainEntity.map((q) => q.name), claimFaqs.map((f) => f.q));
assert.deepEqual(claimLd.mainEntity.map((q) => q.acceptedAnswer.text), claimFaqs.map((f) => f.a));
assert.deepEqual(claimFaqs.map((f) => f.q), [
  'Is claiming free?',
  'How do I verify?',
  'What does Pro ($9/mo) add vs free?',
  'Can I edit after claiming?',
]);
const claimLdHtml = jsonLdHtml(claimLd);
assert.match(claimLdHtml, /"@type":"FAQPage"/);
assert.doesNotMatch(claimLdHtml, /<\/script/i);
for (const f of claimFaqs) {
  const text = `${f.q} ${f.a}`.toLowerCase();
  assert.equal(text.includes('free trial'), false, f.q);
  assert.equal(text.includes('money-back'), false, f.q);
  assert.equal(text.includes('money back'), false, f.q);
}
assert.match(claimFaqs[0].a, /free forever/);
assert.match(claimFaqs[1].a, /24 hours/);
assert.match(claimFaqs[1].a, /one click/i);
assert.match(claimFaqs[2].a, /above free listings/);
assert.match(claimFaqs[3].a, /dashboard/);

const claimPage = readFileSync(new URL('../src/app/claim/page.tsx', import.meta.url), 'utf8');
const claimContent = readFileSync(new URL('../src/app/claim/claim-content.tsx', import.meta.url), 'utf8');
const claimForm = readFileSync(new URL('../src/app/claim/ClaimForm.tsx', import.meta.url), 'utf8');
assert.match(claimPage, /<ClaimFaq\s*\/>/);
assert.match(claimContent, /id="faq"/);
assert.match(claimContent, /jsonLdHtml\(claimFaqJsonLd\(\)\)/);
assert.doesNotMatch(claimContent, /@supabase\/supabase-js/);
assert.doesNotMatch(claimForm, /@supabase\/supabase-js/);
assert.doesNotMatch(claimForm, /claim-content/);

console.log('small-fixes unit checks passed');
