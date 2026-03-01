import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="HireAnyPro" width={32} height={32} className="w-8 h-8" />
              <span className="text-xl font-bold text-white">
                Hire<span className="text-orange-500">Any</span>Pro
              </span>
            </Link>
            <p className="text-sm">Find trusted home service professionals in Florida.</p>
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
            <h3 className="text-white font-semibold mb-3 text-sm">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/claim" className="hover:text-white transition-colors">Claim Your Listing</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Business Dashboard</Link></li>
            </ul>
          </div>
        </div>
        {/* SEO: City + Service links */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-3 text-sm">Top Cities</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {[
                  { name: 'Miami', slug: 'miami' },
                  { name: 'Fort Lauderdale', slug: 'fort-lauderdale' },
                  { name: 'Orlando', slug: 'orlando' },
                  { name: 'West Palm Beach', slug: 'west-palm-beach' },
                  { name: 'Coral Gables', slug: 'coral-gables' },
                  { name: 'Hollywood', slug: 'hollywood' },
                  { name: 'Boca Raton', slug: 'boca-raton' },
                  { name: 'Hialeah', slug: 'hialeah' },
                  { name: 'Pembroke Pines', slug: 'pembroke-pines' },
                  { name: 'Kissimmee', slug: 'kissimmee' },
                ].map(c => (
                  <Link key={c.slug} href={`/services/plumbing/${c.slug}`} className="hover:text-white transition-colors">{c.name}</Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3 text-sm">Regions</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {[
                  { name: 'Miami-Dade County', slug: 'miami-dade' },
                  { name: 'Broward County', slug: 'broward' },
                  { name: 'Palm Beach County', slug: 'palm-beach' },
                  { name: 'Orange County', slug: 'orange' },
                  { name: 'Seminole County', slug: 'seminole' },
                  { name: 'Osceola County', slug: 'osceola' },
                ].map(r => (
                  <Link key={r.slug} href={`/region/${r.slug}`} className="hover:text-white transition-colors">{r.name}</Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3 text-sm">Services in Miami</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {[
                  { name: 'Plumbers', cat: 'plumbing' },
                  { name: 'Electricians', cat: 'electrical' },
                  { name: 'Roofers', cat: 'roofing' },
                  { name: 'HVAC', cat: 'hvac' },
                  { name: 'Painters', cat: 'painting' },
                  { name: 'Landscaping', cat: 'landscaping' },
                  { name: 'Contractors', cat: 'general-contractor' },
                  { name: 'Pool Service', cat: 'pool-service' },
                  { name: 'Cleaning', cat: 'cleaning' },
                  { name: 'Pest Control', cat: 'pest-control' },
                ].map(s => (
                  <Link key={s.cat} href={`/services/${s.cat}/miami`} className="hover:text-white transition-colors">{s.name}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} HireAnyPro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
