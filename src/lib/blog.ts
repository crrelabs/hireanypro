import { supabase } from './supabase';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string;
  category: string | null;
  tags: string[] | null;
  featured_image: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getBlogPosts(options?: {
  category?: string;
  page?: number;
  perPage?: number;
}) {
  const page = options?.page || 1;
  const perPage = options?.perPage || 9;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('published', true)
    .order('published_at', { ascending: false })
    .range(from, to);

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { posts: (data || []) as BlogPost[], total: count || 0 };
}

export async function getBlogPost(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) return null;
  return data as BlogPost;
}

export async function getRelatedPosts(category: string, excludeSlug: string) {
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .eq('category', category)
    .neq('slug', excludeSlug)
    .order('published_at', { ascending: false })
    .limit(3);

  return (data || []) as BlogPost[];
}

export async function getAllBlogSlugs() {
  const { data } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true);

  return data || [];
}

export async function getCategories() {
  const { data } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('published', true);

  const cats = [...new Set((data || []).map(d => d.category).filter(Boolean))];
  return cats as string[];
}

export function formatCategory(cat: string) {
  return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
