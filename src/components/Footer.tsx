import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-white">
                Hire<span className="text-orange-500">Any</span>Pro
              </span>
            </Link>
            <p className="text-sm">Find trusted home service professionals in Miami-Dade County.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Popular Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/category/plumbing" className="hover:text-white transition-colors">Plumbing</Link></li>
              <li><Link href="/category/electrical" className="hover:text-white transition-colors">Electrical</Link></li>
              <li><Link href="/category/hvac" className="hover:text-white transition-colors">HVAC</Link></li>
              <li><Link href="/category/roofing" className="hover:text-white transition-colors">Roofing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">More Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/category/painting" className="hover:text-white transition-colors">Painting</Link></li>
              <li><Link href="/category/landscaping" className="hover:text-white transition-colors">Landscaping</Link></li>
              <li><Link href="/category/cleaning" className="hover:text-white transition-colors">Cleaning</Link></li>
              <li><Link href="/category/general-contractor" className="hover:text-white transition-colors">General Contractor</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">For Businesses</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/claim" className="hover:text-white transition-colors">Claim Your Listing</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Business Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} HireAnyPro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
