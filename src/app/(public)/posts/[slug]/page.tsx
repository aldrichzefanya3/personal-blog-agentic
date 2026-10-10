import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { getPostBySlug, getPublishedPosts } from '@/lib/db/queries/posts';
import { renderMarkdown } from '@/lib/content/markdown';
import { generatePostMetadata } from '@/lib/seo/metadata';
import { buildBlogPostingJsonLd, serializeJsonLd } from '@/lib/seo/jsonld';
import { PostShareButtons } from '@/components/blog/PostShareButtons';
import { ReadingProgress } from '@/components/blog/ReadingProgress';

// Enable ISR with 60 second revalidation (Req 5.3)
export const revalidate = 60;

// Allow slugs not pre-rendered at build time to be rendered on first request
export const dynamicParams = true;

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function estimateReadingTime(markdown: string) {
  const plainText = markdown.replace(/[#>*_`\[\](){}]/g, ' ');
  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function headingSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getTableOfContents(markdown: string) {
  const headings = [...markdown.matchAll(/^(#{2,3})\s+(.*)$/gm)];

  return headings
    .map(([, level, title]) => {
      const normalizedTitle = title.trim();

      return {
        level: level.length,
        title: normalizedTitle,
        slug: headingSlug(normalizedTitle),
      };
    })
    .filter(({ title }) => title.length > 0)
    .slice(0, 8);
}

function addHeadingIds(html: string) {
  return html.replace(/<(h2|h3)([^>]*)>(.*?)<\/\1>/gi, (_, tagName, attrs, content) => {
    const text = content.replace(/<[^>]+>/g, '').trim();
    const id = headingSlug(text);

    if (!id) {
      return `<${tagName}${attrs}>${content}</${tagName}>`;
    }

    return `<${tagName}${attrs} id="${id}">${content}</${tagName}>`;
  });
}

function getRelatedPosts(post: Awaited<ReturnType<typeof getPostBySlug>>) {
  if (!post) return [];

  return getPublishedPosts({ page: 1, pageSize: 8 }).then(({ data }) => {
    const related = data
      .filter((candidate) => candidate.slug !== post.slug)
      .filter((candidate) => {
        const sharedCategory = candidate.categories.some((category) =>
          post.categories.some((currentCategory) => currentCategory.id === category.id),
        );
        const sharedTag = candidate.tags.some((tag) =>
          post.tags.some((currentTag) => currentTag.id === tag.id),
        );

        return sharedCategory || sharedTag;
      })
      .slice(0, 3);

    if (related.length >= 3) {
      return related;
    }

    const fallback = data
      .filter((candidate) => candidate.slug !== post.slug)
      .filter((candidate) => !related.some((item) => item.id === candidate.id))
      .slice(0, 3 - related.length);

    return [...related, ...fallback].slice(0, 3);
  });
}

/**
 * Generate metadata for the post detail page (Req 3.1, 3.2, 3.3, 3.6)
 */
export async function generateMetadata(
  props: PostPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const metadata = await generatePostMetadata(params.slug);

  return (
    metadata || {
      title: 'Post Not Found',
      description: 'The requested post could not be found.',
    }
  );
}

export default async function PostPage(props: PostPageProps) {
  const params = await props.params;

  const getCachedPostBySlug = unstable_cache(
    async (slug: string) => getPostBySlug(slug),
    [`post-${params.slug}`],
    {
      tags: [`post-${params.slug}`],
      revalidate: 60,
    },
  );

  const post = await getCachedPostBySlug(params.slug);

  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const htmlContent = post.content ? addHeadingIds(await renderMarkdown(post.content)) : '';
  const publishedDate = post.published_at
    ? new Date(post.published_at).toISOString().split('T')[0]
    : '';
  const readingTime = estimateReadingTime(post.content ?? '');
  const tableOfContents = getTableOfContents(post.content ?? '');
  const relatedPosts = await getRelatedPosts(post);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';
  const postUrl = `${siteUrl}/posts/${post.slug}`;
  const jsonLd = buildBlogPostingJsonLd(post, postUrl);

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <article className="mx-auto max-w-6xl pb-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.12)] dark:border-slate-700">
          {post.cover_image_url ? (
            <div className="absolute inset-0">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="object-cover opacity-80"
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.35),_rgba(15,23,42,0.9)_58%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-900/25" />

          <div className="relative z-10 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
            <div className="mb-5 flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-100 backdrop-blur-sm transition hover:border-cyan-300/60 hover:bg-cyan-500/10"
                >
                  {category.name}
                </Link>
              ))}
            </div>

            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-200/90">
                {readingTime} min read
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-5 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {post.author?.avatar_url ? (
                  <Image
                    src={post.author.avatar_url}
                    alt={post.author.display_name || 'Author'}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white">
                    {(post.author?.display_name || 'Former contributor')
                      .split(' ')
                      .map((value) => value[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">{post.author?.display_name || 'Former contributor'}</p>
                  {publishedDate && (
                    <time dateTime={publishedDate} className="text-slate-300">
                      {publishedDate}
                    </time>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-100">
                Writing
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className={`xl:sticky xl:top-24 xl:self-start ${tableOfContents.length === 0 ? 'hidden xl:block' : ''}`}>
            {tableOfContents.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Contents
                </p>
                <nav aria-label="Table of contents" className="space-y-2">
                  {tableOfContents.map((heading) => (
                    <a
                      key={`${heading.slug}-${heading.level}`}
                      href={`#${heading.slug}`}
                      className={`block rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-slate-100 hover:text-cyan-700 dark:hover:bg-slate-800 dark:hover:text-cyan-300 ${
                        heading.level === 3 ? 'pl-4 text-slate-600 dark:text-slate-300' : 'font-medium text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {heading.title}
                    </a>
                  ))}
                </nav>
              </div>
            )}
          </aside>

          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Share this article
                  </p>
                </div>
                <PostShareButtons title={post.title} url={postUrl} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {post.tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${tag.slug}`}
                      className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}

              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-em:text-slate-700 prose-a:text-cyan-700 prose-blockquote:border-cyan-500 prose-blockquote:bg-cyan-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:font-medium prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-cyan-700 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-slate-950 prose-pre:p-4 dark:prose-headings:text-slate-50 dark:prose-p:text-slate-200 dark:prose-li:text-slate-200 dark:prose-strong:text-slate-100 dark:prose-em:text-slate-200 dark:prose-a:text-cyan-300 dark:prose-blockquote:bg-slate-800 dark:prose-blockquote:text-slate-100 dark:prose-code:bg-slate-800 dark:prose-code:text-cyan-300 dark:prose-hr:border-slate-700 dark:prose-thead:text-slate-300 dark:prose-tbody:text-slate-200 max-sm:prose-base"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>

            {relatedPosts.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Continue reading
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
                      You might also like
                    </h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      href={`/posts/${relatedPost.slug}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-950"
                    >
                      {relatedPost.cover_image_url ? (
                        <div className="relative mb-4 overflow-hidden rounded-xl">
                          <div className="relative aspect-[4/3]">
                            <Image
                              src={relatedPost.cover_image_url}
                              alt={relatedPost.title}
                              fill
                              className="object-cover transition duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
                          </div>
                        </div>
                      ) : null}

                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
                        {relatedPost.categories[0]?.name ?? 'Article'}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-cyan-700 dark:text-slate-50 dark:group-hover:text-cyan-300">
                        {relatedPost.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </article>
    </>
  );
}

/**
 * Return an empty list at build time — the DB is not reachable during `next build`.
 * Posts are rendered on first request then cached via ISR (revalidate = 60).
 * dynamicParams = true (above) ensures any slug still resolves at runtime.
 */
export async function generateStaticParams() {
  return [];
}
