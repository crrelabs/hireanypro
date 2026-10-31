import { DAY_ORDER, DAY_LABELS, formatDayHours, type DayHours } from '@/lib/hours';

/**
 * Listing-page FAQ built only from facts we hold for the listing (address, Google rating, peer rank in its city,
 * published hours, claim status). Visible on the page and mirrored 1:1 in FAQPage JSON-LD.
 */
export type FaqItem = { q: string; a: string };

export type ListingFaqInput = {
  name: string;
  catText: string; // running-text category, e.g. "plumbing", "HVAC"
  city: string | null;
  stateCode: string;
  county: string | null;
  address: string | null; // cleaned street address (may already include city/ZIP)
  zip: string | null;
  rating: number | null;
  reviewCount: number;
  peers: number | null; // listings in the same category + city + state, including this one
  rankByReviews: number | null; // 1 = most Google reviews among peers
  hours: Record<string, DayHours> | null;
  claimed: boolean;
  isPaid: boolean;
  offersOthers: boolean; // quote form offers "also send to 2 other pros"
};

const fmt = (n: number) => n.toLocaleString('en-US');

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** "Monday to Friday: 8:00 AM - 5:00 PM; Saturday: Closed" (groups consecutive days with the same hours). */
export function weekHoursText(hours: Record<string, DayHours>): string {
  const label = (d: string) => (hours[d] ? formatDayHours(hours[d]) : 'Closed');
  const parts: string[] = [];
  let i = 0;
  while (i < DAY_ORDER.length) {
    let j = i;
    while (j + 1 < DAY_ORDER.length && label(DAY_ORDER[j + 1]) === label(DAY_ORDER[i])) j++;
    const days = i === j ? DAY_LABELS[DAY_ORDER[i]] : `${DAY_LABELS[DAY_ORDER[i]]} ${j === i + 1 ? 'and' : 'to'} ${DAY_LABELS[DAY_ORDER[j]]}`;
    parts.push(`${days}: ${label(DAY_ORDER[i])}`);
    i = j + 1;
  }
  return parts.join('; ');
}

export function buildListingFaq(x: ListingFaqInput): FaqItem[] {
  const out: FaqItem[] = [];
  const where = x.city ? `${x.city}, ${x.stateCode}` : x.stateCode;

  // 1. Location
  if (x.address || x.city) {
    const addr = x.address
      ? `${x.address}${x.city && !x.address.toLowerCase().includes(x.city.toLowerCase()) ? `, ${where}${x.zip ? ` ${x.zip}` : ''}` : ''}`
      : `${where}${x.zip ? ` ${x.zip}` : ''}`;
    out.push({
      q: `Where is ${x.name} located?`,
      a: `${x.name} is listed at ${addr}${x.county ? `, in ${x.county} County` : ''}.`,
    });
  }

  // 2. Rating (+ rank among peers when there is something to compare)
  if (x.rating && x.reviewCount > 0) {
    let a = `${x.name} has a ${x.rating} out of 5 rating on Google from ${fmt(x.reviewCount)} ${x.reviewCount === 1 ? 'review' : 'reviews'}.`;
    // Only mention the rank when it is a real distinction (top 10 or top quarter of the city), never to rank-shame a business.
    if (x.peers && x.peers >= 3 && x.rankByReviews && x.city && (x.rankByReviews <= 10 || x.rankByReviews <= Math.ceil(x.peers / 4))) {
      a += x.rankByReviews === 1
        ? ` That is the most Google reviews of the ${fmt(x.peers)} ${x.catText} businesses HireAnyPro lists in ${x.city}.`
        : ` By number of Google reviews it ranks ${ordinal(x.rankByReviews)} of the ${fmt(x.peers)} ${x.catText} businesses HireAnyPro lists in ${x.city}.`;
    }
    out.push({ q: `How is ${x.name} rated?`, a });
  } else {
    out.push({
      q: `How is ${x.name} rated?`,
      a: `${x.name} has no public Google reviews on file yet. You can leave the first HireAnyPro review on this page.`,
    });
  }

  // 3. Hours (only real published weeks; normalizeHours already drops junk)
  if (x.hours) {
    out.push({ q: `What are ${x.name}'s hours?`, a: `Published hours: ${weekHoursText(x.hours)}. Hours can change, so confirm when you request a quote.` });
  }

  // 4. How to get a quote
  out.push({
    q: `How do I get a quote from ${x.name}?`,
    a: `Use the free "Request a Free Quote" form on this page. HireAnyPro sends your request to ${x.name}${x.isPaid ? ' directly' : ''} and emails you a confirmation; there is no cost or obligation.` +
      (x.offersOthers && x.city ? ` You can also choose to send the same request to up to 2 other top-rated ${x.catText} pros in ${x.city} to compare prices.` : ''),
  });

  // 5. Claim status (honest about where the data comes from)
  out.push(x.claimed
    ? { q: `Is ${x.name} managed by the business owner?`, a: `Yes. The owner of ${x.name} has claimed this HireAnyPro listing and manages its details.` }
    : {
        q: `Is this ${x.name} listing managed by the business?`,
        a: `Not yet. This listing was built from public business information and has not been claimed. If you own ${x.name}, you can claim it for free to update your details and receive quote requests directly.`,
      });

  return out;
}

export const faqJsonLd = (items: FaqItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

