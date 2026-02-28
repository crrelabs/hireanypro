'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Hire<span className="text-orange-500">Any</span>Pro
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/categories" className="text-gray-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Browse Categories
            </Link>
            <Link href="/search" className="text-gray-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Search
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-blue-800 text-sm font-medium transition-colors">
              Pricing
            </Link>
            <Link href="/claim" className="text-gray-600 hover:text-blue-800 text-sm font-medium transition-colors">
              For Business Owners
            </Link>
            <Link href="/search" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Find a Pro
            </Link>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <nav className="flex flex-col gap-2 pt-4">
              <Link href="/categories" className="text-gray-600 hover:text-blue-800 px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                Browse Categories
              </Link>
              <Link href="/search" className="text-gray-600 hover:text-blue-800 px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                Search
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-blue-800 px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                Pricing
              </Link>
              <Link href="/claim" className="text-gray-600 hover:text-blue-800 px-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                For Business Owners
              </Link>
              <Link href="/search" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium text-center" onClick={() => setMobileOpen(false)}>
                Find a Pro
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
