import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { prisma } from '@/lib/database';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { MarketingLayout } from '../../../components/marketing-layout';
import { isDatabaseEnabled } from '../../../lib/runtime-config';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  coverImage: string | null;
  tags: string[];
  publishedAt: Date | null;
}

function normalizeMarkdown(content: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  const minIndent = nonEmptyLines.reduce((currentMin, line) => {
    const match = line.match(/^\s*/);
    const indent = match ? match[0].length : 0;
    return Math.min(currentMin, indent);
  }, Number.POSITIVE_INFINITY);

  const dedented =
    minIndent === Number.POSITIVE_INFINITY
      ? lines
      : lines.map((line) => (line.length >= minIndent ? line.slice(minIndent) : line));

  return dedented.join('\n').trim();
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  if (!isDatabaseEnabled()) {
    notFound();
  }

  const cacheKey = `blog:post:v2:${params.slug}`;

  let post = await cacheGet<BlogPost>(cacheKey);

  if (!post) {
    post = await prisma.blogPost.findFirst({
      where: {
        slug: params.slug,
        published: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        author: true,
        coverImage: true,
        tags: true,
        publishedAt: true,
      },
    });

    if (post) {
      await cacheSet(cacheKey, post, 3600);
    }
  }

  if (!post) {
    notFound();
  }

  const normalizedContent = normalizeMarkdown(post.content);
  const readTime = Math.max(
    3,
    Math.ceil(normalizedContent.replace(/[#*`>-]/g, '').split(/\s+/).length / 220)
  );
  const publishedLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unpublished';

  return (
    <MarketingLayout>
      <article className="px-4 sm:px-6 pt-24 md:pt-28 pb-12 md:pb-16 bg-gradient-to-b from-white via-blue-50/20 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-100 bg-white text-sm font-semibold text-blue-600 hover:text-blue-700 hover:shadow-sm transition-all"
            >
              ← Back to Blog
            </Link>
          </div>

          <header className="rounded-3xl border border-blue-100 bg-white/90 shadow-sm p-6 md:p-10 lg:p-12 mb-8 md:mb-10">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">{post.title}</h1>
            <p className="text-base md:text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl">{post.excerpt}</p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>{post.author}</span>
              <span>•</span>
              <span>{publishedLabel}</span>
              <span>•</span>
              <span>{readTime} min read</span>
            </div>
          </header>

          {post.coverImage && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 mb-10 md:mb-14 shadow-sm">
              <img src={post.coverImage} alt={post.title} className="w-full h-auto object-cover" />
            </div>
          )}

          <div className="rounded-3xl border border-gray-100 bg-white px-6 py-8 md:px-10 md:py-12 shadow-sm">
            <div className="max-w-3xl mx-auto">
              <div className="sticky top-20 md:top-24 z-20 mb-8 md:mb-10">
                <div className="w-fit mx-auto rounded-full border border-blue-100 bg-white/95 backdrop-blur px-4 py-2 text-xs md:text-sm text-gray-600 shadow-sm">
                  <span className="font-semibold text-gray-800">{post.author}</span>
                  <span className="mx-2">•</span>
                  <span>{publishedLabel}</span>
                  <span className="mx-2">•</span>
                  <span>{readTime} min read</span>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8 md:mb-10" />
              <div className="prose prose-gray md:prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 prose-h2:mt-14 prose-h2:mb-5 prose-h3:mt-10 prose-h3:mb-4 prose-p:text-[1.04rem] prose-p:leading-[1.95] prose-p:my-6 prose-li:my-1 prose-ul:my-6 prose-ol:my-6 prose-blockquote:border-blue-200 prose-blockquote:text-gray-700 prose-strong:text-gray-900 prose-code:text-purple-700 prose-a:text-blue-600 hover:prose-a:text-blue-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}
