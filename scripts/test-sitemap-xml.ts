import assert from 'node:assert/strict';
import { renderSitemapIndex, renderUrlset } from '../src/lib/sitemap-xml';
import { buildSitemapIndexEntries, parseListingChunk } from '../src/lib/sitemap';

const urlset = renderUrlset([
  { loc: 'https://hireanypro.com', lastmod: '2026-08-01T00:00:00.000Z', changefreq: 'daily', priority: 1 },
  { loc: 'https://hireanypro.com/listing/ace-plumbing-miami', lastmod: '2026-04-12T15:30:00.000Z' },
]);

assert.match(urlset, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
assert.match(urlset, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
assert.match(urlset, /<loc>https:\/\/hireanypro.com<\/loc>/);
assert.match(urlset, /<lastmod>2026-04-12T15:30:00.000Z<\/lastmod>/);
assert.doesNotMatch(urlset, /2026-03-22T18:48:03/);
assert.equal((urlset.match(/<url>/g) || []).length, 2);

const index = renderSitemapIndex([
  { loc: 'https://hireanypro.com/sitemap/pages.xml', lastmod: '2026-08-01T00:00:00.000Z' },
  { loc: 'https://hireanypro.com/sitemap/listings/0.xml' },
]);

assert.match(index, /<sitemapindex xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
assert.match(index, /<loc>https:\/\/hireanypro.com\/sitemap\/pages.xml<\/loc>/);
assert.doesNotMatch(index, /<urlset/);
assert.equal((index.match(/<sitemap>/g) || []).length, 2);

assert.equal(parseListingChunk('0.xml'), 0);
assert.equal(parseListingChunk('5'), 5);
assert.equal(parseListingChunk('abc'), null);

const indexEntries = buildSitemapIndexEntries(29014, '2026-08-15T12:00:00.000Z');
assert.equal(indexEntries.length, 8);
assert.equal(indexEntries[0].loc, 'https://hireanypro.com/sitemap/pages.xml');
assert.equal(indexEntries[1].loc, 'https://hireanypro.com/sitemap/cities.xml');
assert.equal(indexEntries[2].loc, 'https://hireanypro.com/sitemap/listings/0.xml');
assert.equal(indexEntries[7].loc, 'https://hireanypro.com/sitemap/listings/5.xml');
assert.ok(indexEntries.every((e) => e.lastmod === '2026-08-15T12:00:00.000Z'));

console.log('sitemap-xml unit checks passed');
