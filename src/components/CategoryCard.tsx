import Link from 'next/link';
import { Category } from '@/lib/supabase';

export default function CategoryCard({ category, count }: { category: Category; count?: number }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
    >
      <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{category.icon}</span>
      <h3 className="font-semibold text-gray-900 text-sm text-center">{category.name}</h3>
      {count !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{count} pros</p>
      )}
    </Link>
  );
}
