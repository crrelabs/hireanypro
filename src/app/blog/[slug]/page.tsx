import { getBlogPost, getRelatedPosts, formatCategory } from '@/lib/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import BlogContent from './BlogContent';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | HireAnyPro Blog`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      type: 'article',
      publishedTime: post.published_at || undefined,
      authors: [post.author],
      ...(post.featured_image && { images: [post.featured_image] }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const related = post.category ? await getRelatedPosts(post.category, post.slug) : [];
  const categoryLabel = post.category ? formatCategory(post.category) : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'HireAnyPro' },
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    ...(post.featured_image && { image: post.featured_image }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-800">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-blue-800">Blog</Link>
            {post.category && (
              <>
                <span>/</span>
                <Link href={`/blog?category=${post.category}`} className="hover:text-blue-800">
                  {categoryLabel}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-700 truncate max-w-[200px]">{post.title}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="mb-10">
          {post.category && (
            <Link
              href={`/blog?category=${post.category}`}
              className="inline-block text-xs font-semibold text-orange-500 uppercase tracking-wider mb-3 hover:text-orange-600"
            >
              {categoryLabel}
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>By {post.author}</span>
            <span>•</span>
            <time dateTime={post.published_at || post.created_at}>
              {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.featured_image && (
          <div className="rounded-xl overflow-hidden mb-10">
            <img src={post.featured_image} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <BlogContent content={post.content} category={post.category} />

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-xl p-8 mt-12 text-center">
          <h3 className="text-2xl font-bold mb-3">
            Need {categoryLabel ? `a ${categoryLabel} Pro` : 'a Home Service Professional'}?
          </h3>
          <p className="text-blue-200 mb-6">
            Find trusted, verified professionals in Miami-Dade County.
          </p>
          <Link
            href={post.category ? `/category/${post.category}` : '/search'}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Search HireAnyPro →
          </Link>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((rp) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`} className="group">
                  <article className="bg-white rounded-lg border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    {rp.category && (
                      <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
                        {formatCategory(rp.category)}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-800 transition-colors mt-1 line-clamp-2">
                      {rp.title}
                    </h3>
                    <time className="text-xs text-gray-400 mt-2 block" dateTime={rp.published_at || rp.created_at}>
                      {new Date(rp.published_at || rp.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
