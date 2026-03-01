import { supabase } from '@/lib/supabase';
import CategoryCard from '@/components/CategoryCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Categories — HireAnyPro',
  description: 'Browse home service categories including plumbing, electrical, HVAC, roofing, painting, and more.',
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const { data: categories } = await supabase.from('categories').select('*').order('name');

  // Count listings per category using individual count queries to avoid 1000-row limit
  const countMap: Record<string, number> = {};
  if (categories) {
    const counts = await Promise.all(
      categories.map((cat) =>
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category_id', cat.id)
      )
    );
    categories.forEach((cat, i) => {
      countMap[cat.id] = counts[i].count || 0;
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Browse All Categories</h1>
        <p className="text-gray-500 mt-2">Find the right professional for your home project</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories?.map((cat) => (
          <CategoryCard key={cat.id} category={cat} count={countMap[cat.id] || 0} />
        ))}
      </div>
    </div>
  );
}
