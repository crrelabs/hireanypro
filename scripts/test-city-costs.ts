import assert from 'node:assert/strict';
import {
  canonicalCostTrade,
  cityCostPageAllowed,
  costCityPath,
  decideCityCost,
  eligibleCityCosts,
} from '../src/lib/city-costs';
import { MIN_INDEXABLE_CITY_LISTINGS } from '../src/lib/directory-content';

assert.equal(MIN_INDEXABLE_CITY_LISTINGS, 3);
assert.equal(costCityPath('plumbing', 'miami'), '/costs/plumbing/miami');

assert.equal(canonicalCostTrade('plumbing'), 'plumbing');
assert.equal(canonicalCostTrade('Plumbers'), 'plumbing');
assert.equal(canonicalCostTrade('not-a-trade'), null);

assert.equal(cityCostPageAllowed({ hasGuide: true, isHub: true, state: 'FL', count: 3 }), true);
assert.equal(cityCostPageAllowed({ hasGuide: true, isHub: true, state: 'FL', count: 2 }), false);
assert.equal(cityCostPageAllowed({ hasGuide: true, isHub: true, state: 'GA', count: 10 }), false);
assert.equal(cityCostPageAllowed({ hasGuide: true, isHub: false, state: 'FL', count: 10 }), false);
assert.equal(cityCostPageAllowed({ hasGuide: false, isHub: true, state: 'FL', count: 10 }), false);

assert.deepEqual(decideCityCost({ tradeSlug: 'plumbing', guide: false, hub: null, requestedCity: 'miami' }), { type: 'not-found' });
assert.deepEqual(
  decideCityCost({ tradeSlug: 'plumbing', guide: true, hub: null, requestedCity: 'nope' }),
  { type: 'redirect', href: '/costs/plumbing' },
);
assert.deepEqual(
  decideCityCost({
    tradeSlug: 'plumbing', guide: true, requestedCity: 'valdosta-ga',
    hub: { slug: 'valdosta-ga', state: 'GA', count: 12 },
  }),
  { type: 'redirect', href: '/costs/plumbing' },
);
assert.deepEqual(
  decideCityCost({
    tradeSlug: 'plumbing', guide: true, requestedCity: 'tiny',
    hub: { slug: 'tiny', state: 'FL', count: 2 },
  }),
  { type: 'redirect', href: '/costs/plumbing' },
);
assert.deepEqual(
  decideCityCost({
    tradeSlug: 'plumbing', guide: true, requestedCity: 'miami-fl',
    hub: { slug: 'miami', state: 'FL', count: 40 },
  }),
  { type: 'redirect', href: '/costs/plumbing/miami' },
);
assert.deepEqual(
  decideCityCost({
    tradeSlug: 'plumbing', guide: true, requestedCity: 'miami',
    hub: { slug: 'miami', state: 'FL', count: 40 },
  }),
  { type: 'render' },
);
assert.deepEqual(
  decideCityCost({
    tradeSlug: 'plumbing', guide: true, requestedCity: 'miami',
    hub: { slug: 'miami', state: 'FL', count: 40 },
    liveCount: 2,
  }),
  { type: 'redirect', href: '/costs/plumbing' },
);

const pairs = eligibleCityCosts(
  [
    { slug: 'miami', name: 'Miami', state: 'FL', byCategory: { p: 10, h: 2 } },
    { slug: 'tiny', name: 'Tiny', state: 'FL', byCategory: { p: 2 } },
    { slug: 'valdosta-ga', name: 'Valdosta', state: 'GA', byCategory: { p: 10 } },
    { slug: 'tampa', name: 'Tampa', state: 'FL', byCategory: { p: 4 } },
  ],
  new Map([['plumbing', 'p'], ['hvac', 'h']]),
);
assert.deepEqual(pairs.map((p) => `${p.trade}/${p.city}:${p.count}`), ['plumbing/miami:10', 'plumbing/tampa:4']);

console.log('city-cost unit checks passed');
