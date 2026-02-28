'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatCategory } from '@/lib/blog';

type TocItem = { id: string; text: string; level: number };

export default function BlogContent({ content, category }: { content: string; category: string | null }) {
  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    const headings = content.match(/^#{1,3}\s+.+$/gm) || [];
    const items = headings.map((h) => {
      const level = (h.match(/^#+/) || [''])[0].length;
      const text = h.replace(/^#+\s+/, '');
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return { id, text, level };
    });
    setToc(items);
  }, [content]);

  const categoryLabel = category ? formatCategory(category) : '';

  // Insert mid-article CTA after roughly half the content
  const lines = content.split('\n');
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

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }) => {
          const text = String(children);
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return <h1 id={id} {...props}>{children}</h1>;
        },
        h2: ({ children, ...props }) => {
          const text = String(children);
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return <h2 id={id} {...props}>{children}</h2>;
        },
        h3: ({ children, ...props }) => {
          const text = String(children);
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return <h3 id={id} {...props}>{children}</h3>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
