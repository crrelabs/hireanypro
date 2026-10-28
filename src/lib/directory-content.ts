import { hoursSummary, normalizeHours, type DayHours } from './hours';

/**
 * City x category pages with fewer listings than this are noindex,follow and omitted from the cities sitemap.
 * One- and two-listing pages are the long tail of near-duplicate URLs; three is enough to compare pros.
 */
export const MIN_INDEXABLE_CITY_LISTINGS = 3;

/** Florida ZIP codes are 32000–34999. Anything else in this directory is scrape junk. */
const FLORIDA_ZIP = /^3[234]\d{3}$/;

const MIN_REVIEWS_FOR_RANK = 5;

export function shouldIndexCityPage(count: number): boolean {
  return count >= MIN_INDEXABLE_CITY_LISTINGS;
}

/**
 * Internal links only point at city pages Google may index. Thin (noindex) city pages get no href, so the link equity
 * and crawl budget go to the pages we want indexed. Thin pages stay reachable from their county hub and listings.
 */
export function cityHref(categorySlug: string, citySlug: string, count: number): string | undefined {
  return shouldIndexCityPage(count) ? `/services/${categorySlug}/${citySlug}` : undefined;
}

/** "Plumbing" -> "plumbing", but keep acronyms like "HVAC". */
export function lowerCategory(name: string): string {
  return name.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');
}

export function floridaZip(zip: unknown): string | null {
  if (typeof zip !== 'string') return null;
  const z = zip.trim().slice(0, 5);
  return FLORIDA_ZIP.test(z) ? z : null;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export type TextPart = { text: string; href?: string };

export type CityStatInput = {
  name?: string | null;
  slug?: string | null;
  rating?: number | null;
  review_count?: number | null;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  hours?: unknown;
  claimed?: boolean | null;
};

export type RankedPro = { name: string; slug: string; rating: number; reviewCount: number };

export type CityStats = {
  shown: number;
  complete: boolean;
  rated: number;
  totalReviews: number;
  avg: number;
  topRated: RankedPro[];
  mostReviewed: RankedPro[];
  zips: string[];
  withPhone: number;
  withWebsite: number;
  withHours: number;
  withWeekendHours: number;
  claimed: number;
  atLeast45: number;
  under4: number;
};

function filled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function ranked(row: CityStatInput): RankedPro | null {
  const name = (row.name || '').trim();
  const slug = (row.slug || '').trim();
  const rating = Number(row.rating || 0);
  const reviewCount = Number(row.review_count || 0);
  if (!name || !slug || !(rating > 0) || !(reviewCount > 0)) return null;
  return { name, slug, rating, reviewCount };
}

export function computeCityStats(rows: CityStatInput[], totalCount?: number): CityStats {
  const shown = rows.length;
  const total = totalCount ?? shown;
  let rated = 0;
  let totalReviews = 0;
  let weighted = 0;
  let withPhone = 0;
  let withWebsite = 0;
  let withHours = 0;
  let withWeekendHours = 0;
  let claimed = 0;
  let atLeast45 = 0;
  let under4 = 0;
  const zips = new Set<string>();
  const pros: RankedPro[] = [];

  for (const row of rows) {
    if (filled(row.phone)) withPhone += 1;
    if (filled(row.website)) withWebsite += 1;
    if (row.claimed) claimed += 1;
    const zip = floridaZip(row.zip);
    if (zip) zips.add(zip);
    const hours = normalizeHours(row.hours);
    if (hours) {
      withHours += 1;
      if (hours.saturday || hours.sunday) withWeekendHours += 1;
    }
    const pro = ranked(row);
    if (!pro) continue;
    rated += 1;
    totalReviews += pro.reviewCount;
    weighted += pro.rating * pro.reviewCount;
    if (pro.rating >= 4.5) atLeast45 += 1;
    if (pro.rating < 4) under4 += 1;
    pros.push(pro);
  }

  const topRated = [...pros]
    .filter((p) => p.reviewCount >= MIN_REVIEWS_FOR_RANK)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name))
    .slice(0, 3);
  const mostReviewed = [...pros]
    .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating || a.name.localeCompare(b.name))
    .slice(0, 3);

  return {
    shown,
    complete: shown >= total,
    rated,
    totalReviews,
    avg: totalReviews ? weighted / totalReviews : 0,
    topRated,
    mostReviewed,
    zips: [...zips].sort().slice(0, 12),
    withPhone,
    withWebsite,
    withHours,
    withWeekendHours,
    claimed,
    atLeast45,
    under4,
  };
}

export type StatCard = { label: string; value: string; detail?: string };

function pct(part: number, whole: number): string | undefined {
  if (!whole) return undefined;
  return `${Math.round((part / whole) * 100)}%`;
}

export function cityStatCards(count: number, stats: CityStats): StatCard[] {
  const base = stats.complete ? count : stats.shown;
  const cards: StatCard[] = [
    { label: 'Pros listed', value: formatCount(count) },
    { label: 'With a public rating', value: formatCount(stats.rated), detail: pct(stats.rated, base) },
  ];
  if (stats.rated > 0 && stats.totalReviews > 0) {
    cards.push({
      label: 'Average rating',
      value: `${stats.avg.toFixed(1)} / 5`,
      detail: `${formatCount(stats.totalReviews)} reviews, weighted`,
    });
  }
  cards.push(
    { label: 'Phone on file', value: formatCount(stats.withPhone), detail: pct(stats.withPhone, base) },
    { label: 'Website on file', value: formatCount(stats.withWebsite), detail: pct(stats.withWebsite, base) },
  );
  if (stats.withHours > 0) {
    cards.push({
      label: 'Weekly hours published',
      value: formatCount(stats.withHours),
      detail: stats.withWeekendHours > 0 ? `${formatCount(stats.withWeekendHours)} include a weekend day` : 'Weekdays only',
    });
  }
  if (stats.claimed > 0) {
    cards.push({ label: 'Claimed by the business', value: formatCount(stats.claimed), detail: pct(stats.claimed, base) });
  }
  return cards;
}

export type NeighborCity = { name: string; slug: string; count: number; state: string };
export type SiblingCategory = { name: string; slug: string; count: number };

function proPhrase(p: RankedPro): string {
  return `${p.name} (${p.rating.toFixed(1)} stars, ${formatCount(p.reviewCount)} reviews)`;
}

function placeLabel(cityName: string, stateName: string, county: string | null): string {
  return county ? `${cityName}, ${stateName}, in ${county} County` : `${cityName}, ${stateName}`;
}

/** Same rule as countySlug() in geo.ts, inlined so this module does not open a database client. */
function countyPath(county: string): string {
  return county.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Intro copy with working neighbor links. `categorySlug` is separate from the display name
 * so the sentence can say "plumbing" while the URL stays `plumbing`.
 */
export function buildCityIntroParts(input: {
  categoryName: string;
  categorySlug: string;
  cityName: string;
  stateName: string;
  county: string | null;
  count: number;
  stats: CityStats;
  neighbors: NeighborCity[];
}): TextPart[][] {
  const cat = lowerCategory(input.categoryName);
  const base = input.stats.complete ? input.count : input.stats.shown;
  const paragraphs: TextPart[][] = [];

  const first: TextPart[] = [
    { text: `HireAnyPro lists ${formatCount(input.count)} ${cat} ${input.count === 1 ? 'business' : 'businesses'} in ${placeLabel(input.cityName, input.stateName, input.county)}.` },
  ];
  if (!input.stats.complete && input.stats.shown > 0) {
    first.push({ text: ` Figures below are from ${formatCount(input.stats.shown)} of those listings.` });
  }
  if (input.stats.rated > 0 && input.stats.totalReviews > 0) {
    first.push({
      text: ` ${formatCount(input.stats.rated)} ${input.stats.rated === 1 ? 'has' : 'have'} a public rating, with a review-weighted average of ${input.stats.avg.toFixed(1)} out of 5 across ${formatCount(input.stats.totalReviews)} reviews.`,
    });
    if (input.stats.rated >= 3) {
      const bits: string[] = [];
      if (input.stats.atLeast45 > 0) bits.push(`${formatCount(input.stats.atLeast45)} ${input.stats.atLeast45 === 1 ? 'is' : 'are'} rated 4.5 stars or higher`);
      if (input.stats.under4 > 0) bits.push(`${formatCount(input.stats.under4)} ${input.stats.under4 === 1 ? 'is' : 'are'} under 4.0 stars`);
      if (bits.length) first.push({ text: ` ${bits.join(', and ')}.` });
    }
  } else {
    first.push({ text: ' None of these listings has a public rating yet.' });
  }
  paragraphs.push(first);

  const second: TextPart[] = [];
  const contact: string[] = [];
  if (input.stats.withPhone > 0) contact.push(`${formatCount(input.stats.withPhone)} ${input.stats.withPhone === 1 ? 'has' : 'have'} a phone number on file`);
  if (input.stats.withWebsite > 0) contact.push(`${formatCount(input.stats.withWebsite)} ${input.stats.withWebsite === 1 ? 'lists' : 'list'} a website`);
  if (input.stats.withHours > 0) {
    const weekend = input.stats.withWeekendHours > 0
      ? ` (${formatCount(input.stats.withWeekendHours)} of those include Saturday or Sunday)`
      : '';
    contact.push(`${formatCount(input.stats.withHours)} publish weekly hours${weekend}`);
  }
  if (contact.length && base > 0) {
    second.push({ text: `Of the ${formatCount(base)} ${base === 1 ? 'listing' : 'listings'} counted here, ${listJoin(contact)}.` });
  }
  if (input.stats.topRated.length > 0) {
    if (second.length) second.push({ text: ' ' });
    second.push({ text: `Highest-rated with at least ${MIN_REVIEWS_FOR_RANK} reviews: ` });
    input.stats.topRated.forEach((p, i) => {
      if (i > 0) second.push({ text: i === input.stats.topRated.length - 1 ? ', and ' : ', ' });
      second.push({ text: p.name, href: `/listing/${p.slug}` });
      second.push({ text: ` (${p.rating.toFixed(1)} stars, ${formatCount(p.reviewCount)} reviews)` });
    });
    second.push({ text: '.' });
  } else if (input.stats.mostReviewed.length > 0) {
    const top = input.stats.mostReviewed[0];
    if (second.length) second.push({ text: ' ' });
    second.push({ text: 'Most reviewed: ' });
    second.push({ text: top.name, href: `/listing/${top.slug}` });
    second.push({ text: ` (${formatCount(top.reviewCount)} reviews).` });
  }
  if (second.length) paragraphs.push(second);

  const third: TextPart[] = [];
  const neighborBits = input.neighbors.slice(0, 6);
  if (neighborBits.length > 0) {
    const where = input.county ? `${input.county} County` : input.stateName;
    third.push({ text: `Other ${where} cities with ${cat} listings include ` });
    neighborBits.forEach((n, i) => {
      if (i > 0) third.push({ text: i === neighborBits.length - 1 ? ', and ' : ', ' });
      third.push({ text: `${n.name} (${formatCount(n.count)})`, href: cityHref(input.categorySlug, n.slug, n.count) });
    });
    third.push({ text: '.' });
  }
  if (input.stats.zips.length > 0) {
    if (third.length) third.push({ text: ' ' });
    third.push({ text: `ZIP codes on these listings include ${input.stats.zips.slice(0, 8).join(', ')}.` });
  }
  if (third.length) paragraphs.push(third);

  return paragraphs;
}

export function buildCityFaqs(input: {
  categoryName: string;
  cityName: string;
  stateCode: string;
  stateName: string;
  county: string | null;
  count: number;
  stats: CityStats;
  neighbors: NeighborCity[];
  siblings: SiblingCategory[];
}): { q: string; a: string }[] {
  const cat = lowerCategory(input.categoryName);
  const base = input.stats.complete ? input.count : input.stats.shown;
  const faqs: { q: string; a: string }[] = [];

  const zipSentence = input.stats.zips.length
    ? ` ZIP codes on these listings include ${input.stats.zips.slice(0, 8).join(', ')}.`
    : '';
  faqs.push({
    q: `How many ${cat} businesses are listed in ${input.cityName}, ${input.stateCode}?`,
    a: `HireAnyPro lists ${formatCount(input.count)} ${cat} ${input.count === 1 ? 'business' : 'businesses'} in ${placeLabel(input.cityName, input.stateName, input.county)}.${zipSentence}`,
  });

  if (input.stats.rated > 0 && input.stats.totalReviews > 0) {
    let answer = `${formatCount(input.stats.rated)} of ${formatCount(base)} ${cat} ${base === 1 ? 'business' : 'businesses'} in ${input.cityName} ${input.stats.rated === 1 ? 'has' : 'have'} a public rating. The review-weighted average is ${input.stats.avg.toFixed(1)} out of 5 across ${formatCount(input.stats.totalReviews)} reviews.`;
    if (input.stats.rated >= 3) {
      const bits: string[] = [];
      if (input.stats.atLeast45 > 0) bits.push(`${formatCount(input.stats.atLeast45)} ${input.stats.atLeast45 === 1 ? 'is' : 'are'} rated 4.5 stars or higher`);
      if (input.stats.under4 > 0) bits.push(`${formatCount(input.stats.under4)} ${input.stats.under4 === 1 ? 'is' : 'are'} under 4.0 stars`);
      if (bits.length) answer += ` ${listJoin(bits)}.`;
    }
    faqs.push({
      q: `What is the average rating for ${cat} in ${input.cityName}?`,
      a: answer,
    });
  }

  if (input.stats.topRated.length > 0) {
    faqs.push({
      q: `Which ${cat} pros in ${input.cityName} have the strongest public ratings?`,
      a: `Among businesses with at least ${MIN_REVIEWS_FOR_RANK} reviews, the highest-rated ${cat} pros in ${input.cityName} are ${listJoin(input.stats.topRated.map(proPhrase))}.`,
    });
  }

  const contactBits: string[] = [];
  if (input.stats.withPhone > 0) contactBits.push(`${formatCount(input.stats.withPhone)} ${input.stats.withPhone === 1 ? 'has' : 'have'} a phone number on file`);
  if (input.stats.withWebsite > 0) contactBits.push(`${formatCount(input.stats.withWebsite)} ${input.stats.withWebsite === 1 ? 'has' : 'have'} a website`);
  if (input.stats.withHours > 0) {
    const weekend = input.stats.withWeekendHours > 0
      ? `, including ${formatCount(input.stats.withWeekendHours)} with Saturday or Sunday hours`
      : '';
    contactBits.push(`${formatCount(input.stats.withHours)} publish weekly hours${weekend}`);
  }
  if (contactBits.length > 0 && base > 0) {
    faqs.push({
      q: `How many ${cat} pros in ${input.cityName} list a phone, website, or hours?`,
      a: `Of the ${formatCount(base)} ${cat} ${base === 1 ? 'listing' : 'listings'} counted in ${input.cityName}, ${listJoin(contactBits)}. You can request a quote from any listing on this page.`,
    });
  }

  const neighborBits = input.neighbors.slice(0, 5);
  if (neighborBits.length > 0) {
    const where = input.county ? `${input.county} County` : input.stateName;
    const more = input.neighbors.length > neighborBits.length
      ? ` ${formatCount(input.neighbors.length - neighborBits.length)} more ${where} ${input.neighbors.length - neighborBits.length === 1 ? 'city is' : 'cities are'} linked below.`
      : '';
    faqs.push({
      q: input.county
        ? `Which other ${input.county} County cities have ${cat} pros?`
        : `Which other ${input.stateName} cities have ${cat} pros?`,
      a: `In ${where}, ${cat} listings also appear in ${listJoin(neighborBits.map((n) => `${n.name} (${formatCount(n.count)})`))}.${more}`,
    });
  }

  const siblingBits = input.siblings.slice(0, 5);
  if (siblingBits.length > 0) {
    faqs.push({
      q: `What other home services can I compare in ${input.cityName}?`,
      a: `In ${input.cityName}, ${input.stateCode}, HireAnyPro also lists ${listJoin(siblingBits.map((s) => `${lowerCategory(s.name)} (${formatCount(s.count)})`))}.`,
    });
  }

  faqs.push({
    q: `How do I request ${cat} quotes in ${input.cityName}?`,
    a: `Use the free quote form on this page to send one description of the job to up to three ${cat} pros in ${input.cityName}, or open a listing and request a quote from that business. There is no charge to request a quote.`,
  });

  return faqs;
}

export function faqPageJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.filter((f) => f.q.trim() && f.a.trim()).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export type CountyCity = { name: string; slug: string; count: number };
export type CountyRollup = { county: string; count: number; cities: CountyCity[] };

export type CategoryNarrativeInput = {
  categoryName: string;
  categorySlug: string;
  total: number;
  cityCount: number;
  byState: { FL: number; GA: number; AL: number };
  rated: number;
  avg: number;
  totalReviews: number;
  withPhone: number;
  withWebsite: number;
  counties: CountyRollup[];
  topCities: NeighborCity[];
};

export function categoryStatCards(input: CategoryNarrativeInput): StatCard[] {
  const cards: StatCard[] = [
    { label: 'Pros listed', value: formatCount(input.total) },
    { label: 'Cities', value: formatCount(input.cityCount) },
  ];
  if (input.counties.length > 0) {
    cards.push({ label: 'Florida counties', value: formatCount(input.counties.length) });
  }
  if (input.rated > 0 && input.totalReviews > 0) {
    cards.push({
      label: 'Average rating',
      value: `${input.avg.toFixed(1)} / 5`,
      detail: `${formatCount(input.rated)} rated, ${formatCount(input.totalReviews)} reviews`,
    });
  }
  if (input.total > 0) {
    cards.push(
      { label: 'Phone on file', value: formatCount(input.withPhone), detail: pct(input.withPhone, input.total) },
      { label: 'Website on file', value: formatCount(input.withWebsite), detail: pct(input.withWebsite, input.total) },
    );
  }
  return cards;
}

export function buildCategoryIntro(input: CategoryNarrativeInput): TextPart[][] {
  const cat = lowerCategory(input.categoryName);
  const paragraphs: TextPart[][] = [];
  const first: TextPart[] = [
    { text: `HireAnyPro lists ${formatCount(input.total)} ${cat} ${input.total === 1 ? 'business' : 'businesses'} in ${formatCount(input.cityCount)} ${input.cityCount === 1 ? 'city' : 'cities'}` },
  ];
  if (input.counties.length > 0) {
    first.push({ text: `, across ${formatCount(input.counties.length)} Florida ${input.counties.length === 1 ? 'county' : 'counties'}` });
  }
  const elsewhere: string[] = [];
  if (input.byState.GA > 0) elsewhere.push(`${formatCount(input.byState.GA)} in Georgia`);
  if (input.byState.AL > 0) elsewhere.push(`${formatCount(input.byState.AL)} in Alabama`);
  if (elsewhere.length) first.push({ text: `. ${formatCount(input.byState.FL)} are in Florida${elsewhere.length ? `, plus ${listJoin(elsewhere)}` : ''}` });
  first.push({ text: '.' });
  if (input.topCities.length > 0) {
    first.push({ text: ' The most listings are in ' });
    input.topCities.slice(0, 5).forEach((c, i, arr) => {
      if (i > 0) first.push({ text: i === arr.length - 1 ? ', and ' : ', ' });
      const label = c.state !== 'FL' ? `${c.name}, ${c.state}` : c.name;
      first.push({ text: `${label} (${formatCount(c.count)})`, href: cityHref(input.categorySlug, c.slug, c.count) });
    });
    first.push({ text: '.' });
  }
  paragraphs.push(first);

  const second: TextPart[] = [];
  if (input.rated > 0 && input.totalReviews > 0) {
    second.push({
      text: `${formatCount(input.rated)} of these businesses have a public rating. The review-weighted average is ${input.avg.toFixed(1)} out of 5 across ${formatCount(input.totalReviews)} reviews.`,
    });
  }
  if (input.total > 0 && (input.withPhone > 0 || input.withWebsite > 0)) {
    const bits: string[] = [];
    if (input.withPhone > 0) bits.push(`${formatCount(input.withPhone)} have a phone number on file`);
    if (input.withWebsite > 0) bits.push(`${formatCount(input.withWebsite)} have a website`);
    if (second.length) second.push({ text: ' ' });
    second.push({ text: `${listJoin(bits)}.` });
  }
  if (input.counties.length > 0) {
    const top = input.counties.slice(0, 3);
    if (second.length) second.push({ text: ' ' });
    second.push({ text: 'The largest county counts are ' });
    top.forEach((c, i) => {
      if (i > 0) second.push({ text: i === top.length - 1 ? ', and ' : ', ' });
      second.push({ text: `${c.county} County (${formatCount(c.count)})`, href: `/region/${countyPath(c.county)}` });
    });
    second.push({ text: '.' });
  }
  if (second.length) paragraphs.push(second);
  return paragraphs;
}

export function buildCategoryFaqs(input: CategoryNarrativeInput): { q: string; a: string }[] {
  const cat = lowerCategory(input.categoryName);
  const faqs: { q: string; a: string }[] = [];
  const topCities = input.topCities.slice(0, 5);
  faqs.push({
    q: `How many ${cat} pros does HireAnyPro list?`,
    a: `HireAnyPro lists ${formatCount(input.total)} ${cat} ${input.total === 1 ? 'business' : 'businesses'} in ${formatCount(input.cityCount)} ${input.cityCount === 1 ? 'city' : 'cities'}${input.counties.length ? ` and ${formatCount(input.counties.length)} Florida ${input.counties.length === 1 ? 'county' : 'counties'}` : ''}${topCities.length ? `. The most are in ${listJoin(topCities.map((c) => `${c.name}${c.state !== 'FL' ? `, ${c.state}` : ''} (${formatCount(c.count)})`))}` : ''}.`,
  });

  if (input.counties.length > 0) {
    const top = input.counties.slice(0, 5);
    faqs.push({
      q: `Which Florida counties have the most ${cat} pros?`,
      a: `The most ${cat} listings are in ${listJoin(top.map((c) => {
        const city = c.cities[0];
        return `${c.county} County (${formatCount(c.count)}${city ? `, led by ${city.name} with ${formatCount(city.count)}` : ''})`;
      }))}.`,
    });
  }

  if (input.rated > 0 && input.totalReviews > 0) {
    faqs.push({
      q: `What is the average rating for ${cat} pros?`,
      a: `${formatCount(input.rated)} ${cat} ${input.rated === 1 ? 'business has' : 'businesses have'} a public rating. Across ${formatCount(input.totalReviews)} reviews, the review-weighted average is ${input.avg.toFixed(1)} out of 5.`,
    });
  }

  if (input.total > 0 && (input.withPhone > 0 || input.withWebsite > 0)) {
    const bits: string[] = [];
    if (input.withPhone > 0) bits.push(`${formatCount(input.withPhone)} (${Math.round((input.withPhone / input.total) * 100)}%) have a phone number on file`);
    if (input.withWebsite > 0) bits.push(`${formatCount(input.withWebsite)} (${Math.round((input.withWebsite / input.total) * 100)}%) have a website`);
    faqs.push({
      q: `How many ${cat} listings include a phone number or website?`,
      a: `Of the ${formatCount(input.total)} ${cat} listings, ${listJoin(bits)}.`,
    });
  }

  faqs.push({
    q: `How do I get a ${cat} quote?`,
    a: `Open a city below and use the free quote form to send the job to up to three ${cat} pros there, or request a quote from a single listing. Choosing a city shows every ${cat} business we list in that city.`,
  });

  return faqs;
}

/** Imported descriptions are one template sentence. A longer, non-template description is treated as written for this business. */
export function isBoilerplateDescription(description: unknown): boolean {
  const d = typeof description === 'string' ? description.trim() : '';
  if (d.length < 180) return true;
  if (/provides professional .+ services in /i.test(d)) return true;
  if (/is a professional .+ serving the /i.test(d)) return true;
  return false;
}

export function buildListingMarketParagraphs(input: {
  name: string;
  categoryName: string;
  categorySlug: string;
  cityName: string;
  citySlug: string;
  stateCode: string;
  stateName: string;
  county: string | null;
  zip: string | null;
  hours: Record<string, DayHours> | null;
  count: number;
  rated: number;
  avg: number;
  totalReviews: number;
  peers: RankedPro[];
}): TextPart[][] {
  const cat = lowerCategory(input.categoryName);
  const zip = floridaZip(input.zip);
  const where = [input.cityName, input.stateCode].filter(Boolean).join(', ');
  const first: TextPart[] = [
    { text: `${input.name} is listed under ${input.categoryName} in ${where}${zip ? ` (ZIP ${zip})` : ''}${input.county ? `, ${input.county} County` : ''}.` },
  ];
  const paragraphs: TextPart[][] = [first];

  const market: TextPart[] = [];
  if (input.count <= 1) {
    market.push({ text: `This is the only ${cat} business HireAnyPro lists in ${input.cityName}, ${input.stateName}.` });
  } else {
    market.push({ text: `HireAnyPro lists ${formatCount(input.count)} ${cat} businesses in ${input.cityName}, ${input.stateName}.` });
    if (input.rated >= 2 && input.totalReviews > 0) {
      market.push({
        text: ` ${formatCount(input.rated)} have a public rating, with a review-weighted average of ${input.avg.toFixed(1)} out of 5 across ${formatCount(input.totalReviews)} reviews.`,
      });
    } else if (input.rated === 1) {
      market.push({ text: ' One of them has a public rating.' });
    }
    const peers = input.peers.slice(0, 3);
    if (peers.length > 0) {
      market.push({ text: ' Other listings in this city include ' });
      peers.forEach((p, i) => {
        if (i > 0) market.push({ text: i === peers.length - 1 ? ', and ' : ', ' });
        market.push({ text: p.name, href: `/listing/${p.slug}` });
        if (p.rating > 0 && p.reviewCount > 0) market.push({ text: ` (${p.rating.toFixed(1)} stars, ${formatCount(p.reviewCount)} reviews)` });
      });
      market.push({ text: '.' });
    }
  }
  paragraphs.push(market);

  const schedule = hoursSummary(input.hours);
  if (schedule) paragraphs.push([{ text: schedule }]);

  return paragraphs;
}

export function listingMarketLinks(input: {
  categoryName: string;
  categorySlug: string;
  cityName: string;
  citySlug: string;
  county: string | null;
  count?: number;
}): { href: string; label: string }[] {
  const cat = lowerCategory(input.categoryName);
  const links: { href: string; label: string }[] = [];
  // Thin (noindex) city pages are not linked; see cityHref.
  if (input.count === undefined || shouldIndexCityPage(input.count)) {
    links.push({ href: `/services/${input.categorySlug}/${input.citySlug}`, label: `${input.categoryName} in ${input.cityName}` });
  }
  links.push({ href: `/category/${input.categorySlug}`, label: `All ${cat} pros` });
  if (input.county) {
    links.push({
      href: `/region/${countyPath(input.county)}`,
      label: `All home services in ${input.county} County`,
    });
  }
  return links;
}

/** Same-county cities for this category, excluding the current page. Florida only. */
export function neighborsInCounty<T extends { name: string; slug: string; variants: string[]; count: number; state: string }>(
  groups: T[],
  countyCityNames: string[],
  currentSlug: string,
  state: string,
): T[] {
  const wanted = new Set(countyCityNames.map((c) => c.trim().toLowerCase()));
  return groups
    .filter((g) => g.state === state && g.slug !== currentSlug && g.variants.some((v) => wanted.has(v.trim().toLowerCase())))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Other cities in the same state for this category. Used for GA/AL, which have no Florida county. */
export function neighborsInState<T extends { name: string; slug: string; count: number; state: string }>(
  groups: T[],
  currentSlug: string,
  state: string,
): T[] {
  return groups
    .filter((g) => g.state === state && g.slug !== currentSlug)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
