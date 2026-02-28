import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ListingCard from '@/components/ListingCard';
import type { Metadata } from 'next';
import Link from 'next/link';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: category } = await supabase.from('categories').select('name').eq('slug', slug).single();
  if (!category) return { title: 'Category Not Found' };
  const title = `${category.name} in Miami-Dade County | HireAnyPro`;
  const description = `Find top-rated ${category.name.toLowerCase()} professionals in Miami-Dade County. Compare ratings, read reviews, and request free quotes on HireAnyPro.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `https://hireanypro.com/category/${slug}`, siteName: 'HireAnyPro' },
  };
}

export const revalidate = 300;

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const { data: category } = await supabase.from('categories').select('*').eq('slug', slug).single();
  if (!category) notFound();

  const { data: listings } = await supabase
    .from('listings')
    .select('*, categories(name, slug, icon)')
    .eq('category_id', category.id)
    .order('featured', { ascending: false })
    .order('rating', { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-blue-800">Home</Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-blue-800">Categories</Link>
        <span>/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-4xl">{category.icon}</span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{category.name}</h1>
          <p className="text-gray-500 text-sm">{listings?.length || 0} professionals available</p>
        </div>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">{category.icon}</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-500 text-sm">Be the first {category.name.toLowerCase()} professional listed!</p>
        </div>
      )}
    </div>
  );
}
