'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatCategory } from '@/lib/blog';
import { blogToc, headingId, stripDuplicateTitle } from '@/lib/blog-markdown';

export default function BlogContent({ content, category, title }: { content: string; category: string | null; title: string }) {
  const body = stripDuplicateTitle(content, title);
  const toc = blogToc(content, title);

  const categoryLabel = category ? formatCategory(category) : '';

  // Insert mid-article CTA after roughly half the content
  const lines = body.split('\n');
  const mid = Math.floor(lines.length / 2);
  const firstHalf = lines.slice(0, mid).join('\n');
  const secondHalf = lines.slice(mid).join('\n');

  return (
    <div className="lg:flex lg:gap-12">
      {/* TOC Sidebar */}
      {toc.length > 2 && (
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Table of Contents</h4>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block text-sm text-gray-500 hover:text-blue-800 transition-colors ${
                    item.level === 3 ? 'pl-4' : ''
                  }`}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Article Body */}
      <div className="flex-1 min-w-0">
        <div className="prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-blue-800 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl">
          <MarkdownBlock content={firstHalf} />
        </div>

        {/* Mid-article CTA */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 my-8 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Need {categoryLabel ? `a ${categoryLabel} Pro` : 'Help'}?
          </p>
          <p className="text-gray-600 text-sm mb-4">
            Browse verified professionals on HireAnyPro.
          </p>
          <Link
            href={category ? `/category/${category}` : '/search'}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Find a Pro →
          </Link>
        </div>

        <div className="prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-blue-800 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl">
          <MarkdownBlock content={secondHalf} />
        </div>
      </div>
    </div>
  );
}

function nodeText(children: ReactNode): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join('');
  if (typeof children === 'object' && 'props' in children) {
    return nodeText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // The page template already renders post.title as the only <h1>.
        h1: ({ children, node, ...props }) => {
          void node;
          return <h2 id={headingId(nodeText(children))} {...props}>{children}</h2>;
        },
        h2: ({ children, node, ...props }) => {
          void node;
          return <h2 id={headingId(nodeText(children))} {...props}>{children}</h2>;
        },
        h3: ({ children, node, ...props }) => {
          void node;
          return <h3 id={headingId(nodeText(children))} {...props}>{children}</h3>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
