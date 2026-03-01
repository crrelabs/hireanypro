import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import StarRating from '@/components/StarRating';
import MapViewWrapper from '@/components/MapViewWrapper';
import QuoteRequestForm from '@/components/QuoteRequestForm';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: listing } = await supabase
    .from('listings')
    .select('name, description, city, state, phone, rating, review_count, tier, claimed, categories(name)')
    .eq('slug', slug)
    .single();

  if (!listing) return { title: 'Listing Not Found' };

  const categories = listing.categories as unknown as { name: string } | null;
  const cat = categories?.name || 'Service Provider';
  const metaIsPaid = listing.tier === 'pro' || listing.tier === 'featured';
  const title = `${listing.name} - ${cat} in ${listing.city}, FL | HireAnyPro`;
  const description = `${listing.name} is a trusted ${cat.toLowerCase()} in ${listing.city}, FL. Rated ${listing.rating}/5 from ${listing.review_count} reviews.${metaIsPaid && listing.phone ? ` Call ${listing.phone} for a free quote.` : ''}`;

  return {
    title,
    description,
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
  const hours = listing.hours as Record<string, string> | null;

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
      addressRegion: listing.state,
      postalCode: listing.zip,
      addressCountry: 'US',
    },
    ...(listing.lat && listing.lng ? { geo: { '@type': 'GeoCoordinates', latitude: listing.lat, longitude: listing.lng } } : {}),
    ...(listing.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: listing.rating,
        reviewCount: listing.review_count || 0,
        bestRating: 5,
      },
    } : {}),
    ...(hours ? {
      openingHoursSpecification: Object.entries(hours).filter(([, v]) => v != null).map(([day, h]) => {
        const dayMap: Record<string, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
        const hObj = typeof h === 'object' && h !== null ? h as { open?: string; close?: string } : null;
        const opens = hObj?.open || (typeof h === 'string' ? h.split('-')[0]?.trim() : '') || '';
        const closes = hObj?.close || (typeof h === 'string' ? h.split('-')[1]?.trim() : '') || '';
        return { '@type': 'OpeningHoursSpecification', dayOfWeek: dayMap[day] || day, opens, closes };
      }),
    } : {}),
    priceRange: '$$',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hireanypro.com' },
      ...(listing.categories ? [{ '@type': 'ListItem', position: 2, name: cat, item: `https://hireanypro.com/category/${(listing.categories as Record<string, string>).slug}` }] : []),
      { '@type': 'ListItem', position: listing.categories ? 3 : 2, name: listing.name as string },
    ],
  };

  return [localBusiness, breadcrumb];
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  const { data: listing } = await supabase
    .from('listings')
    .select('*, categories(name, slug, icon)')
    .eq('slug', slug)
    .single();

  if (!listing) notFound();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('listing_id', listing.id)
    .order('created_at', { ascending: false });

  const hours = listing.hours as Record<string, string> | null;
  const dayLabels: Record<string, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
  const jsonLdItems = buildJsonLd(listing);
  const isPaid = listing.tier === 'pro' || listing.tier === 'featured';

  return (
    <>
      {jsonLdItems.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <a href="/" className="hover:text-blue-800">Home</a>
          <span>/</span>
          {listing.categories && (
            <>
              <a href={`/category/${listing.categories.slug}`} className="hover:text-blue-800">{listing.categories.name}</a>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900">{listing.name}</span>
        </nav>

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
                    <StarRating rating={listing.rating} size="md" />
                    <span className="font-semibold text-gray-900">{listing.rating}</span>
                    <span className="text-gray-400 text-sm">({listing.review_count} reviews)</span>
                  </div>
                </div>
                {listing.featured && (
                  <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Featured</span>
                )}
              </div>
              <p className="text-gray-600 mt-4 leading-relaxed">{listing.description}</p>
            </div>

            {/* Map */}
            {listing.lat && listing.lng && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-64">
                  <MapViewWrapper listings={[listing]} center={[listing.lat, listing.lng]} />
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews ({reviews?.length || 0})</h2>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-800 font-semibold text-sm">{review.author_name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{review.author_name}</p>
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} />
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm pl-11">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No reviews yet.</p>
              )}
            </div>
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
                    <span>{listing.address}<br />{listing.city}, {listing.state} {listing.zip}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Blurred placeholder for contact info */}
                  <div className="relative rounded-lg bg-gray-50 p-4 overflow-hidden">
                    <div className="blur-sm select-none pointer-events-none space-y-2 text-sm text-gray-400" aria-hidden="true">
                      <p>📞 (305) 555-0123</p>
                      <p>✉️ info@example.com</p>
                      <p>🌐 www.example.com</p>
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
                    <span>{listing.address}<br />{listing.city}, {listing.state} {listing.zip}</span>
                  </div>
                  {!listing.claimed && (
                    <>
                      <a href={`/claim?listing=${listing.slug}`} className="block w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm text-center mt-4">
                        🏢 Are you the owner? Claim this listing
                      </a>
                      <p className="text-xs text-gray-400 text-center">Claim your profile to show contact info and receive leads directly.</p>
                    </>
                  )}
                </div>
              )}

              {/* Quote Request Form - right after contact info */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <QuoteRequestForm listingId={listing.id} businessName={listing.name} tier={listing.tier} businessEmail={listing.email} />
              </div>

              {/* Hours */}
              {hours && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Hours</h3>
                  <div className="space-y-1.5 text-sm">
                    {Object.entries(dayLabels).map(([key, label]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500">{label}</span>
                        <span className="text-gray-900 font-medium">{hours[key] && typeof hours[key] === 'object' ? `${(hours[key] as {open?: string}).open || ''} - ${(hours[key] as {close?: string}).close || ''}` : (hours[key] || 'Closed')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claim CTA for paid listings that somehow aren't claimed */}
              {isPaid && !listing.claimed && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <a href={`/claim?listing=${listing.slug}`} className="block w-full bg-blue-800 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm text-center">
                    🏢 Claim This Listing
                  </a>
                  <p className="text-xs text-gray-400 text-center mt-2">Are you the owner? Claim to manage this page.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
