import assert from 'node:assert/strict';
import { normalizeHours } from '../src/lib/hours';
import {
  buildCategoryFaqs,
  buildCityFaqs,
  buildCityIntroParts,
  buildListingMarketParagraphs,
  computeCityStats,
  faqPageJsonLd,
  floridaZip,
  isBoilerplateDescription,
  neighborsInCounty,
  neighborsInState,
  shouldIndexCityPage,
} from '../src/lib/directory-content';

assert.equal(floridaZip('32801'), '32801');
assert.equal(floridaZip('32801-1234'), '32801');
assert.equal(floridaZip('32000'), '32000');
assert.equal(floridaZip('34999'), '34999');
assert.equal(floridaZip('90210'), null);
assert.equal(floridaZip('00000'), null);
assert.equal(floridaZip('31601'), null);
assert.equal(floridaZip('  '), null);
assert.equal(floridaZip(null), null);

assert.equal(shouldIndexCityPage(0), false);
assert.equal(shouldIndexCityPage(1), false);
assert.equal(shouldIndexCityPage(2), false);
assert.equal(shouldIndexCityPage(3), true);

const hours = normalizeHours('{"monday":"08:00-17:00","tuesday":"08:00-17:00","saturday":"09:00-13:00"}');
assert.ok(hours);
assert.equal(hours.monday.open, '08:00');
assert.equal(hours.saturday.close, '13:00');
assert.equal(normalizeHours({ sunday: '00:00-00:00' }), null);
assert.equal(normalizeHours({ monday: { open: '09:00', close: '17:00' }, friday: { open: '09:00', close: '15:00' } })?.friday.close, '15:00');

const stats = computeCityStats([
  { name: 'Alpha Plumbing', slug: 'alpha', rating: 5, review_count: 10, phone: '555', website: 'https://a.example', zip: '32801', hours, claimed: true },
  { name: 'Beta Plumbing', slug: 'beta', rating: 1, review_count: 2, phone: '', website: null, zip: '90210', hours: { sunday: '00:00-00:00' } },
  { name: 'Gamma Plumbing', slug: 'gamma', rating: 4.6, review_count: 8, zip: '32803-0001', website: 'https://g.example' },
  { name: 'Delta Plumbing', slug: 'delta', rating: 0, review_count: 0, phone: '555' },
], 4);

assert.equal(stats.complete, true);
assert.equal(stats.rated, 3);
assert.equal(stats.withPhone, 2);
assert.equal(stats.withWebsite, 2);
assert.equal(stats.withHours, 1);
assert.equal(stats.withWeekendHours, 1);
assert.equal(stats.claimed, 1);
assert.deepEqual(stats.zips, ['32801', '32803']);
assert.equal(stats.avg.toFixed(2), ((5 * 10 + 1 * 2 + 4.6 * 8) / 20).toFixed(2));
assert.equal(stats.topRated[0].slug, 'alpha');
assert.equal(stats.topRated.some((p) => p.slug === 'beta'), false);
assert.equal(stats.atLeast45, 2);
assert.equal(stats.under4, 1);

const partial = computeCityStats([{ name: 'Only', slug: 'only', rating: 5, review_count: 1 }], 10);
assert.equal(partial.complete, false);

const neighbors = neighborsInCounty([
  { name: 'Orlando', slug: 'orlando', variants: ['Orlando'], count: 40, state: 'FL' },
  { name: 'Windermere', slug: 'windermere', variants: ['Windermere', 'windermere'], count: 5, state: 'FL' },
  { name: 'Tampa', slug: 'tampa', variants: ['Tampa'], count: 80, state: 'FL' },
  { name: 'Valdosta', slug: 'valdosta-ga', variants: ['Valdosta'], count: 2, state: 'GA' },
], ['Orlando', 'Winter Park'], 'windermere', 'FL');
assert.deepEqual(neighbors.map((n) => n.slug), ['orlando']);

const ga = neighborsInState([
  { name: 'Valdosta', slug: 'valdosta-ga', count: 4, state: 'GA' },
  { name: 'Thomasville', slug: 'thomasville-ga', count: 1, state: 'GA' },
  { name: 'Miami', slug: 'miami', count: 100, state: 'FL' },
], 'valdosta-ga', 'GA');
assert.deepEqual(ga.map((n) => n.slug), ['thomasville-ga']);

const faqs = buildCityFaqs({
  categoryName: 'Plumbing',
  cityName: 'Windermere',
  stateCode: 'FL',
  stateName: 'Florida',
  county: 'Orange',
  count: 4,
  stats,
  neighbors: [{ name: 'Orlando', slug: 'orlando', count: 40, state: 'FL' }],
  siblings: [{ name: 'HVAC', slug: 'hvac', count: 7 }],
});
assert.ok(faqs.some((f) => f.a.includes('Orlando (40)')));
assert.ok(faqs.some((f) => f.a.includes('HVAC') || f.a.includes('HVAC'.toLowerCase()) || f.a.includes('hvac') || f.a.includes('HVAC')));
assert.ok(faqs.some((f) => /hvac \(7\)/i.test(f.a)));
assert.ok(faqs.some((f) => f.a.includes('Orange County')));
assert.ok(faqs.every((f) => !f.a.includes('555')));
assert.ok(faqs.every((f) => !/27,553|5,366/.test(f.a)));
const jsonLd = faqPageJsonLd(faqs);
assert.equal(jsonLd['@type'], 'FAQPage');
assert.equal(jsonLd.mainEntity.length, faqs.length);
assert.deepEqual(jsonLd.mainEntity.map((q) => q.name), faqs.map((f) => f.q));
assert.deepEqual(jsonLd.mainEntity.map((q) => q.acceptedAnswer.text), faqs.map((f) => f.a));

const unrated = buildCityFaqs({
  categoryName: 'Plumbing',
  cityName: 'Arcadia',
  stateCode: 'FL',
  stateName: 'Florida',
  county: null,
  count: 2,
  stats: computeCityStats([{ name: 'Solo', slug: 'solo' }], 2),
  neighbors: [],
  siblings: [],
});
const lowRated = computeCityStats([
  { name: 'A', slug: 'a', rating: 3.2, review_count: 10 },
  { name: 'B', slug: 'b', rating: 3.4, review_count: 8 },
  { name: 'C', slug: 'c', rating: 3.9, review_count: 6 },
], 3);
const lowFaqs = buildCityFaqs({
  categoryName: 'Appliance Repair',
  cityName: 'Arcadia',
  stateCode: 'FL',
  stateName: 'Florida',
  county: 'DeSoto',
  count: 3,
  stats: lowRated,
  neighbors: [],
  siblings: [],
});
const lowAnswer = lowFaqs.find((f) => f.q.startsWith('What is the average'))?.a || '';
assert.equal(lowAnswer.includes('0 are'), false);
assert.ok(lowAnswer.includes('3 are under 4.0'));

assert.equal(unrated.some((f) => f.q.startsWith('What is the average rating')), false);
assert.ok(unrated.some((f) => f.q.startsWith('How do I request')));

const intro = buildCityIntroParts({
  categoryName: 'Plumbing',
  categorySlug: 'plumbing',
  cityName: 'Windermere',
  stateName: 'Florida',
  county: 'Orange',
  count: 4,
  stats,
  neighbors: [{ name: 'Orlando', slug: 'orlando', count: 40, state: 'FL' }],
}).flat();
assert.ok(intro.some((p) => p.href === '/services/plumbing/orlando' && p.text.includes('40')));
assert.ok(intro.some((p) => p.href === '/listing/alpha'));
assert.equal(intro.some((p) => (p.text || '').includes('90210')), false);

assert.equal(isBoilerplateDescription(''), true);
assert.equal(isBoilerplateDescription('Ace Plumbing provides professional plumbing services in Tampa, Florida.'), true);
assert.equal(isBoilerplateDescription('ZULIA LOCKSMITH DORAL is a professional locksmith serving the Miami-Dade County area.'), true);
const longDescription = 'Family-owned shop on Colonial Drive. We repair slab leaks, replace water heaters, and pull permits ourselves. Call before 10am for same-day weekday slots. We do not charge a trip fee inside the city limits, and every estimate is written before work starts.';
assert.equal(longDescription.length >= 180, true);
assert.equal(isBoilerplateDescription(longDescription), false);

const market = buildListingMarketParagraphs({
  name: 'Ace Plumbing',
  categoryName: 'Plumbing',
  categorySlug: 'plumbing',
  cityName: 'Arcadia',
  citySlug: 'arcadia',
  stateCode: 'FL',
  stateName: 'Florida',
  county: 'DeSoto',
  zip: '34266',
  hours,
  count: 4,
  rated: 3,
  avg: 4.2,
  totalReviews: 20,
  peers: [{ name: 'Beta Plumbing', slug: 'beta', rating: 4.8, reviewCount: 11 }],
}).flat();
assert.ok(market.some((p) => p.text.includes('ZIP 34266')));
assert.ok(market.some((p) => p.text.includes('DeSoto County')));
assert.ok(market.some((p) => p.href === '/listing/beta'));
assert.ok(market.some((p) => p.text.includes('4.2')));
assert.equal(market.some((p) => /\$\d|invented|typically costs/i.test(p.text)), false);

const only = buildListingMarketParagraphs({
  name: 'Solo Electric',
  categoryName: 'Electrical',
  categorySlug: 'electrical',
  cityName: 'Bristol',
  citySlug: 'bristol',
  stateCode: 'FL',
  stateName: 'Florida',
  county: 'Liberty',
  zip: '99999',
  hours: null,
  count: 1,
  rated: 0,
  avg: 0,
  totalReviews: 0,
  peers: [],
}).flat().map((p) => p.text).join('');
assert.ok(only.includes('only electrical business'));
assert.equal(only.includes('99999'), false);
assert.equal(only.includes('0.0'), false);

const categoryFaqs = buildCategoryFaqs({
  categoryName: 'HVAC',
  categorySlug: 'hvac',
  total: 12,
  cityCount: 4,
  byState: { FL: 12, GA: 0, AL: 0 },
  rated: 10,
  avg: 4.5,
  totalReviews: 100,
  withPhone: 8,
  withWebsite: 6,
  counties: [{ county: 'St. Lucie', count: 7, cities: [{ name: 'Fort Pierce', slug: 'fort-pierce', count: 5 }] }],
  topCities: [{ name: 'Fort Pierce', slug: 'fort-pierce', count: 5, state: 'FL' }],
});
assert.ok(categoryFaqs.some((f) => f.a.includes('St. Lucie County (7') && f.a.includes('Fort Pierce')));
assert.ok(categoryFaqs.every((f) => !/27,553|5,366/.test(f.a)));
const categoryLd = faqPageJsonLd(categoryFaqs);
assert.equal(categoryLd.mainEntity.length, categoryFaqs.length);

console.log('directory-content checks passed');
