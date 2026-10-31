import { supabase } from '@/lib/supabase';
import { notFound, permanentRedirect } from 'next/navigation';
import listingRedirects from '@/data/listing-redirects.json';
import StarRating from '@/components/StarRating';
import MapViewWrapper from '@/components/MapViewWrapper';
import QuoteRequestForm from '@/components/QuoteRequestForm';
import ReviewForm from '@/components/ReviewForm';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListingViewBeacon from '@/components/ListingViewBeacon';
import { OwnerClaimBanner, ClaimLink } from '@/components/OwnerClaim';
import { recentViews } from '@/lib/listing-views';
import Link from 'next/link';
import type { Metadata } from 'next';
import { cityPageSlug, getCountyForCity, countySlug, stateCode, stateName } from '@/lib/geo';
import { DAY_LABELS, formatDayHours, normalizeHours } from '@/lib/hours';
import { isBoilerplateDescription, MIN_INDEXABLE_CITY_LISTINGS } from '@/lib/directory-content';
import { getCityCategorySnapshot } from '@/lib/listings';
import ListingMarketContext from '@/components/ListingMarketContext';
import StickyQuoteBar from '@/components/StickyQuoteBar';
import { buildListingFaq, faqJsonLd } from '@/lib/listing-faq';

export const revalidate = 3600;

// Cached pages (ISR): rendered on first request, then served from Vercel's cache and refreshed in the background.
// Returning [] means nothing is prerendered at build time; every path is generated on demand and cached.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

// "4900 Rio Grande Ave, Orlando, FL 32839, USA" already includes city/ZIP: don't repeat them on a second line.
const cleanAddress = (a: unknown) => (typeof a === 'string' ? a.replace(/,?\s*(USA|United States)\s*$/i, '').trim() : '');

// Lowercase a category name for running text but keep acronyms ("HVAC", not "hvac").
const catText = (n: string) => n.split(' ').map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: listing, error } = await supabase
    .from('listings')
    .select('name, description, city, state, phone, email, website, address, rating, review_count, tier, claimed, categories(name)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`listing meta ${slug}: ${error.message}`);

  if (!listing) return { title: 'Listing Not Found' };

  const categories = listing.categories as unknown as { name: string } | null;
  const cat = categories?.name || 'Service Provider';
  const metaIsPaid = listing.tier === 'pro' || listing.tier === 'featured';
  const st = stateCode(listing.state);
  const title = listing.city ? `${listing.name} - ${cat} in ${listing.city}, ${st} | HireAnyPro` : `${listing.name} - ${cat} in ${stateName(st)} | HireAnyPro`;
  const ratingText = listing.rating && listing.review_count
    ? ` Rated ${listing.rating}/5 from ${Number(listing.review_count).toLocaleString('en-US')} ${listing.review_count === 1 ? 'review' : 'reviews'}.`
    : '';
  const description = `${listing.name} is listed under ${cat} in ${listing.city ? `${listing.city}, ${st}` : stateName(st)}.${ratingText}${metaIsPaid && listing.phone ? ` Call ${listing.phone} for a free quote.` : ' Request a free quote on HireAnyPro.'}`;

  // Thin listings (no description and no contact info beyond a name) are kept
  // out of Google's index to avoid soft-404 / thin-content signals.
  const isTest = slug.startsWith('zz-hap-test'); // internal QA listings must never be indexed
  const isThin =
    isTest ||
    !listing.claimed &&
    !(listing.description && String(listing.description).trim()) &&
    !listing.phone && !listing.email && !listing.website && !listing.address;

  return {
    title,
    description,
    ...(isThin ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `https://hireanypro.com/listing/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://hireanypro.com/listing/${slug}`,
      siteName: 'HireAnyPro',
      type: 'website',
    },
  };
}

function buildJsonLd(listing: Record<string, unknown>) {
  const cat = (listing.categories as Record<string, string> | null)?.name || 'Service Provider';
  const hours = normalizeHours(listing.hours);

  const localBusiness: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.name,
    description: listing.description,
    telephone: listing.phone || undefined,
    url: `https://hireanypro.com/listing/${listing.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: stateCode(listing.state as string | null),
      postalCode: listing.zip,
      addressCountry: 'US',
    },
    ...(listing.lat && listing.lng ? { geo: { '@type': 'GeoCoordinates', latitude: listing.lat, longitude: listing.lng } } : {}),
    ...(listing.rating && Number(listing.review_count || 0) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: listing.rating,
        reviewCount: listing.review_count || 0,
        bestRating: 5,
      },
    } : {}),
    ...(hours ? {
      openingHoursSpecification: Object.entries(hours).map(([day, h]) => ({
        '@type': 'OpeningHoursSpecification', dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1), opens: h.open, closes: h.close === '00:00' && h.open === '00:00' ? '23:59' : h.close,
      })),
    } : {}),
  };
  // Drop empty fields so Google doesn't see null values.
  if (!localBusiness.description) delete localBusiness.description;
  const addr = localBusiness.address as Record<string, unknown>;
  for (const k of Object.keys(addr)) if (addr[k] == null || addr[k] === '') delete addr[k];
  if (addr.streetAddress) {
    const a = cleanAddress(addr.streetAddress);
    const i = listing.city ? a.toLowerCase().indexOf(`, ${String(listing.city).toLowerCase()}`) : -1;
    addr.streetAddress = i > 0 ? a.slice(0, i) : a;
  }

  const catSlug = (listing.categories as Record<string, string> | null)?.slug;
  const crumb: { '@type': string; position: number; name: string; item?: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hireanypro.com' },
  ];
  if (listing.categories && catSlug) {
    crumb.push({ '@type': 'ListItem', position: crumb.length + 1, name: cat, item: `https://hireanypro.com/category/${catSlug}` });
  }
  if (listing.city && catSlug) {
    crumb.push({
      '@type': 'ListItem',
      position: crumb.length + 1,
      name: String(listing.city),
      item: `https://hireanypro.com/services/${catSlug}/${cityPageSlug(String(listing.city), listing.state as string | null)}`,
    });
  }
  crumb.push({ '@type': 'ListItem', position: crumb.length + 1, name: listing.name as string });
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumb,
  };

  return [localBusiness, breadcrumb];
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*, categories(name, slug, icon)')
    .eq('slug', slug)
    .maybeSingle();
  // A database hiccup must not become a cached 404 (ISR would keep it for an hour and Google would drop the URL).
  if (listingError) throw new Error(`listing ${slug}: ${listingError.message}`);

  if (!listing) {
    // Removed listings (merged duplicates, non-business entries, fixed slugs) get a permanent (308) redirect.
    // Map lives in src/data/listing-redirects.json (too many entries for next.config redirects on Vercel).
    const target = (listingRedirects as Record<string, string>)[decodeURIComponent(slug)];
    if (target) permanentRedirect(target);
    notFound();
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('listing_id', listing.id)
    .order('created_at', { ascending: false });

  const { data: nearby } = listing.category_id && listing.city
    ? await supabase
        .from('listings')
        .select('slug, name, rating, review_count')
        .eq('category_id', listing.category_id)
        .eq('city', listing.city)
        .eq('state', stateCode(listing.state))
        .neq('id', listing.id)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(8)
    : { data: null };

  // Only link the city x category page when it is indexable (3+ listings); thin city pages are noindex (see cityHref).
  const cityLinkOk = (nearby?.length || 0) + 1 >= MIN_INDEXABLE_CITY_LISTINGS;

  // County pages are Florida-only; near-border GA/AL listings have no Florida county.
  // Use the listing's own county column when present; fall back to the city's primary county.
  const listingCounty = stateCode(listing.state) !== 'FL' ? null : (listing.county as string | null) || (listing.city ? await getCountyForCity(listing.city) : null);

  // 30-day page views (bot-filtered beacon), shown to owners on unclaimed listings as a reason to claim.
  const views30 = !listing.claimed ? (await recentViews([listing.id]))[listing.id] || 0 : 0;

  const hours = normalizeHours(listing.hours);
  const thinListing = isBoilerplateDescription(listing.description) && (!reviews || reviews.length === 0);
  const market = thinListing && listing.category_id && listing.city
    ? await getCityCategorySnapshot(listing.category_id, listing.city, listing.state, listing.slug)
    : null;
  const address = cleanAddress(listing.address);
  const addressHasCity = !!(address && listing.city && address.toLowerCase().includes(String(listing.city).toLowerCase()));
  const cityLine = [listing.city, [stateCode(listing.state), listing.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const catLabel = listing.categories?.name ? catText(listing.categories.name) : 'home service';
  const description = (listing.description && String(listing.description).trim())
    || `${listing.name} is ${/^[aeiou]/i.test(catLabel) ? 'an' : 'a'} ${catLabel} business${listing.city ? ` in ${listing.city}, ${stateCode(listing.state)}` : ''}${listing.rating && listing.review_count ? `, rated ${listing.rating} out of 5 from ${Number(listing.review_count).toLocaleString('en-US')} Google ${listing.review_count === 1 ? 'review' : 'reviews'}` : ''}. Request a free quote below.`;
  const isPaid = listing.tier === 'pro' || listing.tier === 'featured';

  // Peer rank for the FAQ: same category + city + state, ranked by Google review count. Non-critical: on a read
  // error the rank sentence is simply left out (the rest of the page is unaffected).
  let peers: number | null = null, rankByReviews: number | null = null;
  if (listing.category_id && listing.city) {
    const base = () => supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('category_id', listing.category_id).eq('city', listing.city).eq('state', stateCode(listing.state));
    const [all, above] = await Promise.all([
      base(),
      Number(listing.review_count || 0) > 0 ? base().gt('review_count', Number(listing.review_count)) : Promise.resolve({ count: null, error: null }),
    ]);
    if (!all.error && all.count != null) peers = all.count;
    if (!above.error && above.count != null && Number(listing.review_count || 0) > 0) rankByReviews = above.count + 1;
  }
  const faq = buildListingFaq({
    name: listing.name,
    catText: catLabel,
    city: listing.city || null,
    stateCode: stateCode(listing.state),
    county: listingCounty,
    address: address || null,
    zip: listing.zip || null,
    rating: listing.rating ? Number(listing.rating) : null,
    reviewCount: Number(listing.review_count || 0),
    peers,
    rankByReviews,
    hours,
    claimed: !!listing.claimed,
    isPaid,
    offersOthers: !isPaid && !!(listing.categories && listing.city && nearby && nearby.length > 0),
  });
  const jsonLdItems = [...buildJsonLd(listing), faqJsonLd(faq)];

  return (
    <>
      {jsonLdItems.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}

      {!slug.startsWith('zz-hap-test') && <ListingViewBeacon listingId={listing.id} />}
      <StickyQuoteBar targetId="quote" form="listing" label={`Get a free quote from ${listing.name.length > 28 ? 'this pro' : listing.name}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          ...(listing.categories ? [{ label: listing.categories.name, href: `/category/${listing.categories.slug}` }] : []),
          ...(listing.city ? [{ label: listing.city, href: listing.categories && cityLinkOk ? `/services/${listing.categories.slug}/${cityPageSlug(listing.city, listing.state)}` : undefined }] : []),
          { label: listing.name },
        ]} />

        {!listing.claimed && <OwnerClaimBanner slug={listing.slug} name={listing.name} listingId={listing.id} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{listing.categories?.icon || '🏠'}</span>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{listing.name}</h1>
                      {listing.categories && (
                        <a href={`/category/${listing.categories.slug}`} className="text-sm text-orange-600 font-medium hover:underline">
                          {listing.categories.name}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {listing.rating ? (
                      <>
                        <StarRating rating={listing.rating} size="md" />
                        <span className="font-semibold text-gray-900">{listing.rating}</span>
                        {listing.review_count > 0 && (
                          <span className="text-gray-400 text-sm">on Google · {Number(listing.review_count).toLocaleString('en-US')} {listing.review_count === 1 ? 'review' : 'reviews'}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">No reviews yet</span>
                    )}
                  </div>
                </div>
                {listing.featured && (
                  <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Featured</span>
                )}
              </div>
              <p className="text-gray-600 mt-4 leading-relaxed">{description}</p>
            </div>

            {market && listing.categories && (
              <ListingMarketContext
                name={listing.name}
                categoryName={listing.categories.name}
                categorySlug={listing.categories.slug}
                cityName={market.name}
                citySlug={market.slug}
                stateCode={stateCode(listing.state)}
                stateName={stateName(listing.state)}
                county={listingCounty}
                zip={listing.zip}
                hours={hours}
                count={market.count}
                rated={market.rated}
                avg={market.avg}
                totalReviews={market.totalReviews}
                peers={market.peers}
              />
            )}

            {/* Map */}
            {listing.lat && listing.lng && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-64">
                  <MapViewWrapper listings={[listing]} center={[listing.lat, listing.lng]} />
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Contact Info</h2>
                {isPaid && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200">
                    ✅ Verified Business
                  </span>
                )}
              </div>

              {isPaid ? (
                <div className="space-y-3 text-sm">
                  {listing.phone && (
                    <a href={`tel:${listing.phone}`} className="flex items-center gap-3 text-gray-700 hover:text-blue-800">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {listing.phone}
                    </a>
                  )}
                  {listing.email && (
                    <a href={`mailto:${listing.email}`} className="flex items-center gap-3 text-gray-700 hover:text-blue-800">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {listing.email}
                    </a>
                  )}
                  {listing.website && (
                    <a href={listing.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-blue-800">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Website
                    </a>
                  )}
                  <div className="flex items-start gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{address}{address && !addressHasCity ? <><br />{cityLine}</> : null}{!address ? cityLine : null}</span>
                  </div>
                  {/* Quote form for paid listings */}
                  <div id="quote" className="mt-4 pt-4 border-t border-gray-100">
                    <QuoteRequestForm listingId={listing.id} businessName={listing.name} tier={listing.tier} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Blurred placeholder for contact info */}
                  <div className="relative rounded-lg bg-gray-50 p-4 overflow-hidden">
                    <div className="blur-sm select-none pointer-events-none space-y-2 text-sm text-gray-400" aria-hidden="true">
                      {/* Neutral bars, not fake numbers: placeholder text like "555-0123" / "example.com" was indexed on every unclaimed page. */}
                      <div className="h-3 w-40 rounded bg-gray-300" />
                      <div className="h-3 w-48 rounded bg-gray-300" />
                      <div className="h-3 w-32 rounded bg-gray-300" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
                      <p className="text-sm text-gray-600 font-medium text-center px-4">
                        📞 Contact info available when this business claims their profile
                      </p>
                    </div>
                  </div>
                  {/* Address still visible */}
                  <div className="flex items-start gap-3 text-gray-700 text-sm">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{address}{address && !addressHasCity ? <><br />{cityLine}</> : null}{!address ? cityLine : null}</span>
                  </div>
                  {/* Quote form right here for free/unclaimed */}
                  <div id="quote" className="mt-4 pt-4 border-t border-gray-100">
                    <QuoteRequestForm listingId={listing.id} businessName={listing.name} tier={listing.tier}
                      othersLabel={listing.categories && listing.city && nearby && nearby.length > 0 ? `${catText(listing.categories.name)} pros in ${listing.city}` : undefined} />
                  </div>

                  {!listing.claimed && (
                    <>
                      <ClaimLink slug={listing.slug} className="block w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm text-center mt-4">
                        🏢 Are you the owner? Claim this listing
                      </ClaimLink>
                      {views30 >= 2 && (
                        <p className="text-xs text-gray-700 text-center bg-yellow-50 border border-yellow-200 rounded-md py-1.5 px-2">👀 {views30} people viewed this page in the last 30 days.</p>
                      )}
                      <p className="text-xs text-gray-400 text-center">Claim your profile to show contact info and receive leads directly.</p>
                    </>
                  )}
                </div>
              )}

              {/* Hours */}
              {hours && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Hours</h3>
                  <div className="space-y-1.5 text-sm">
                    {Object.entries(DAY_LABELS).map(([key, label]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500">{label}</span>
                        <span className="text-gray-900 font-medium">{hours[key] ? formatDayHours(hours[key]) : 'Closed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claim CTA for paid listings that somehow aren't claimed */}
              {isPaid && !listing.claimed && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <ClaimLink slug={listing.slug} className="block w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm text-center">
                    🏢 Claim This Listing
                  </ClaimLink>
                  <p className="text-xs text-gray-400 text-center mt-2">Are you the owner? Claim to manage this page.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews - full width, below sidebar on mobile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-8">
          {listing.rating && listing.review_count > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <StarRating rating={listing.rating} size="md" />
              <span className="font-semibold text-gray-900">{listing.rating}</span>
              <span className="text-gray-500 text-sm">on Google · {Number(listing.review_count).toLocaleString('en-US')} {listing.review_count === 1 ? 'review' : 'reviews'}</span>
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            HireAnyPro Reviews {reviews && reviews.length > 0 ? `(${reviews.length})` : ''}
          </h2>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4 mb-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-800 font-semibold text-sm">{(review.author_name || '?').charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{review.author_name}</p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm pl-11">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-6">Be the first to review {listing.name}!</p>
          )}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Leave a Review</h3>
            <ReviewForm listingId={listing.id} businessName={listing.name} />
          </div>
        </div>

        {/* FAQ from the listing's own facts (mirrored in FAQPage JSON-LD above). */}
        <section className="mt-8 bg-white rounded-xl border border-gray-200 p-6" aria-labelledby="listing-faq">
          <h2 id="listing-faq" className="text-lg font-bold text-gray-900 mb-4">{listing.name}: common questions</h2>
          <div className="divide-y divide-gray-100">
            {faq.map((f) => (
              <div key={f.q} className="py-3 first:pt-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 text-sm">{f.q}</h3>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {nearby && nearby.length > 0 && listing.categories && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Other {catText(listing.categories.name)} pros in {listing.city}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {nearby.map((n: { slug: string; name: string; rating: number | null; review_count: number | null }) => (
                <li key={n.slug}>
                  <Link href={`/listing/${n.slug}`} className="text-blue-800 hover:underline font-medium">
                    {n.name}
                  </Link>
                  {n.rating ? (
                    <span className="text-xs text-gray-500 ml-2">{n.rating}★ ({n.review_count || 0})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Internal Linking */}
        <div className="mt-8 p-6 bg-gray-50 rounded-xl space-y-3">
          {listing.categories && (
            <p className="text-sm text-gray-600">
              <Link href={`/category/${listing.categories.slug}`} className="text-blue-800 hover:underline font-medium">
                Browse all {listing.categories.name}{stateCode(listing.state) === 'FL' ? ' in Florida' : ''} →
              </Link>
            </p>
          )}
          {listing.categories && listing.city && cityLinkOk && (
            <p className="text-sm text-gray-600">
              <Link href={`/services/${listing.categories.slug}/${cityPageSlug(listing.city, listing.state)}`} className="text-blue-800 hover:underline font-medium">
                More {catText(listing.categories.name)} pros in {listing.city} →
              </Link>
            </p>
          )}
          {listing.city && listingCounty && (
            <p className="text-sm text-gray-600">
              <Link href={`/region/${countySlug(listingCounty)}`} className="text-blue-800 hover:underline font-medium">
                All home services in {listingCounty} County →
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
