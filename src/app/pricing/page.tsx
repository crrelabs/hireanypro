'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Get your business listed and visible to customers.',
    features: [
      'Basic listing in directory',
      'Appears in search results',
      'Business name & contact info',
      'Category placement',
      'Customer reviews',
    ],
    cta: 'Claim Your Listing',
    ctaLink: '/claim',
    style: 'border-gray-200 bg-white',
    buttonStyle: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    badge: null,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'Stand out and get more leads with premium features.',
    features: [
      'Everything in Free',
      'Direct lead routing to your email',
      'Up to 10 photos',
      'Verified badge ✓',
      'Priority placement in search',
      'Edit your business profile',
      'Response time tracking',
    ],
    cta: 'Upgrade to Pro',
    plan: 'pro' as const,
    style: 'border-blue-800 bg-white ring-2 ring-blue-800',
    buttonStyle: 'bg-blue-800 text-white hover:bg-blue-700',
    badge: 'Most Popular',
  },
  {
    name: 'Featured',
    price: '$99',
    period: '/mo',
    description: 'Maximum visibility and premium placement everywhere.',
    features: [
      'Everything in Pro',
      'Top placement in all searches',
      'Homepage carousel feature',
      'Highlighted listing card',
      'Performance reports & analytics',
      'Featured badge ⭐',
      'Priority customer support',
    ],
    cta: 'Go Featured',
    plan: 'featured' as const,
    style: 'border-orange-400 bg-gradient-to-b from-orange-50 to-white',
    buttonStyle: 'bg-orange-500 text-white hover:bg-orange-600',
    badge: null,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(plan: 'pro' | 'featured') {
    const email = prompt('Enter your email address:');
    if (!email) return;
    const listingId = prompt('Enter your listing ID (or leave blank):') || '';

    setLoading(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email, listingId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch {
      alert('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-gray-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Grow Your Business with <span className="text-orange-500">HireAnyPro</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. Upgrade anytime to get more leads and visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border-2 p-8 flex flex-col ${p.style} transition-shadow hover:shadow-lg`}
            >
              {p.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                    {p.badge}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-2">{p.name}</h2>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">{p.price}</span>
                <span className="text-gray-500">{p.period}</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">{p.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {p.ctaLink ? (
                <Link
                  href={p.ctaLink}
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${p.buttonStyle}`}
                >
                  {p.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleCheckout(p.plan!)}
                  disabled={loading === p.plan}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${p.buttonStyle} disabled:opacity-50`}
                >
                  {loading === p.plan ? 'Loading...' : p.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-gray-500">
          <p>All plans include a 14-day money-back guarantee. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
