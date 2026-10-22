#!/usr/bin/env node
/**
 * Prove the split-sitemap contract against the live production URL set:
 *  - sitemap.xml is a sitemapindex
 *  - child urlsets stay well under 10,000 URLs and a few hundred KB
 *  - each file is well-formed XML and returns HTTP 200
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const BASE_URL = 'https://hireanypro.com';
const LISTING_CHUNK_SIZE = 5_000;
const OUT_DIR = '/tmp/hap-sitemaps';
const SOURCE = process.env.SITEMAP_SOURCE || '/tmp/sitemap.xml';
const PORT = Number(process.env.SITEMAP_PROOF_PORT || 4173);

function downloadSourceIfNeeded() {
  try {
    if (statSync(SOURCE).size > 1_000_000) return;
  } catch {
    // missing
  }
  const result = spawnSync('curl', ['-sS', '--max-time', '90', '-o', SOURCE, `${BASE_URL}/sitemap.xml`], {
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('Failed to download production sitemap.xml');
}

function parseUrlset(xml) {
  if (!xml.includes('<urlset') || xml.includes('<sitemapindex')) {
    throw new Error('Expected a <urlset> document');
  }
  const entries = [];
  const re = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
  let match;
  while ((match = re.exec(xml))) {
    entries.push({ loc: match[1], lastmod: match[2] });
  }
  return entries;
}

function classify(loc) {
  const path = loc.replace(BASE_URL, '') || '/';
  if (
    path === '/' ||
    path === '/categories' ||
    path === '/pricing' ||
    path === '/blog' ||
    path.startsWith('/blog/') ||
    path.startsWith('/category/')
  ) {
    return 'pages';
  }
  if (path.startsWith('/services/') || path.startsWith('/region/')) return 'cities';
  if (path.startsWith('/listing/')) return 'listings';
  return 'other';
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlsetXml(entries) {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : '';
      return `<url><loc>${escapeXml(e.loc)}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function indexXml(locs) {
  const body = locs.map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

function assertWellFormed(xml, expectRoot) {
  const result = spawnSync(
    'python3',
    ['-c', 'import sys,xml.etree.ElementTree as ET; ET.fromstring(sys.stdin.read())'],
    { input: xml, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(`Invalid XML: ${result.stderr || result.stdout}`);
  }
  const root = /<(sitemapindex|urlset)\b/.exec(xml)?.[1];
  if (root !== expectRoot) throw new Error(`Expected <${expectRoot}>, got <${root}>`);
}

function curlFile(path) {
  const result = spawnSync('curl', ['-sS', '-w', '\n%{http_code} %{size_download}', `http://127.0.0.1:${PORT}${path}`], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`curl ${path} failed: ${result.stderr}`);
  const lines = result.stdout.split('\n');
  const meta = lines.pop();
  const body = lines.join('\n');
  const [status, size] = meta.split(' ');
  const root = /<(sitemapindex|urlset)\b/.exec(body)?.[1];
  const count = (body.match(path === '/sitemap.xml' ? /<sitemap>/g : /<url>/g) || []).length;
  return { path, status: Number(status), root, count, bytes: Number(size) };
}

function waitForServer() {
  for (let i = 0; i < 30; i++) {
    const probe = spawnSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', `http://127.0.0.1:${PORT}/sitemap.xml`], {
      encoding: 'utf8',
    });
    if (probe.stdout.trim() === '200') return;
    spawnSync('sleep', ['0.1']);
  }
  throw new Error('Local sitemap server did not become ready');
}

function main() {
  downloadSourceIfNeeded();
  const raw = readFileSync(SOURCE, 'utf8');
  const urls = parseUrlset(raw);

  const groups = { pages: [], cities: [], listings: [], other: [] };
  for (const entry of urls) groups[classify(entry.loc)].push(entry);
  if (groups.other.length) {
    throw new Error(`Unexpected paths: ${groups.other.map((e) => e.loc).join(', ')}`);
  }

  const listingChunks = [];
  for (let i = 0; i < groups.listings.length; i += LISTING_CHUNK_SIZE) {
    listingChunks.push(groups.listings.slice(i, i + LISTING_CHUNK_SIZE));
  }

  const files = {
    '/sitemap.xml': indexXml([
      `${BASE_URL}/sitemap/pages.xml`,
      `${BASE_URL}/sitemap/cities.xml`,
      ...listingChunks.map((_, i) => `${BASE_URL}/sitemap/listings/${i}.xml`),
    ]),
    '/sitemap/pages.xml': urlsetXml(groups.pages),
    '/sitemap/cities.xml': urlsetXml(groups.cities),
  };
  listingChunks.forEach((chunk, i) => {
    files[`/sitemap/listings/${i}.xml`] = urlsetXml(chunk);
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const report = Object.entries(files).map(([path, xml]) => {
    const isIndex = path === '/sitemap.xml';
    assertWellFormed(xml, isIndex ? 'sitemapindex' : 'urlset');
    const count = (xml.match(isIndex ? /<sitemap>/g : /<url>/g) || []).length;
    if (!isIndex && count > 10_000) throw new Error(`${path} has ${count} URLs`);
    const dest = `${OUT_DIR}${path}`;
    mkdirSync(dest.slice(0, dest.lastIndexOf('/')), { recursive: true });
    writeFileSync(dest, xml);
    return { path, bytes: Buffer.byteLength(xml), root: isIndex ? 'sitemapindex' : 'urlset', count };
  });

  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: OUT_DIR,
    stdio: 'ignore',
  });

  try {
    waitForServer();
    const curls = ['/sitemap.xml', '/sitemap/pages.xml', '/sitemap/listings/0.xml', '/sitemap/cities.xml'].map(curlFile);
    const failed = curls.filter((c) => c.status !== 200 || !c.root);
    if (failed.length) {
      console.error(JSON.stringify({ failed, files: report }, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({
      source: { bytes: Buffer.byteLength(raw), urls: urls.length, root: 'urlset' },
      files: report,
      curl: curls,
    }, null, 2));
  } finally {
    server.kill('SIGTERM');
  }
}

main();
