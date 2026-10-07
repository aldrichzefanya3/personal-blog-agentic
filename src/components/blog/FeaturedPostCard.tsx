import Image from 'next/image';
import Link from 'next/link';
import type { PostWithRelations } from '@/types';
import { CategoryBadge } from './CategoryBadge';
import { PostCoverImage } from './PostCoverImage';
import { TagBadge } from './TagBadge';

export interface FeaturedPostCardProps {
  post: PostWithRelations;
}

/**
 * FeaturedPostCard component - displays a prominent featured post card with
 * larger layout, prominent cover image with overlay gradient, larger typography,
 * and "Featured" badge.
 *
 * Requirements:
 * - Visual hierarchy (larger, more prominent)
 * - Content prioritization
 * - Full width or 2-column span layout
 * - Prominent cover image with overlay
 * - "Featured" badge
 */
export function FeaturedPostCard({ post }: FeaturedPostCardProps) {
  const excerpt = post.excerpt
    ? post.excerpt.length > 300
      ? post.excerpt.slice(0, 300) + '...'
      : post.excerpt
    : post.content
      ? post.content.slice(0, 300) + '...'
      : '';

  const formattedDate = post.published_at
    ? new Date(post.published_at).toISOString().split('T')[0]
    : '';

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_38px_90px_rgba(14,165,233,0.14)] dark:border-slate-700 dark:bg-slate-900/90">
      <div className="absolute left-4 top-4 z-10 rounded-full bg-gradient-to-r from-sky-600 to-violet-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg">
        Featured
      </div>

      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Link
          href={`/posts/${post.slug}`}
          className="relative block min-w-0 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-cyan-400"
          aria-label={`Read ${post.title}`}
        >
          <div className="relative aspect-[5/4] w-full overflow-hidden md:h-full">
            {post.cover_image_url ? (
              <>
                <PostCoverImage
                  src={post.cover_image_url}
                  alt={post.title}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent md:bg-gradient-to-r" />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-100 to-violet-200 dark:from-sky-950 dark:via-indigo-950 dark:to-violet-900">
                <svg className="h-24 w-24 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </Link>

        <div className="flex min-w-0 flex-col justify-center p-6 sm:p-8 lg:p-10">
          <h2 className="mb-4 text-3xl font-black leading-tight tracking-[-0.04em] text-slate-900 md:text-4xl dark:text-slate-50">
            <Link
              href={`/posts/${post.slug}`}
              className="transition-colors hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:hover:text-cyan-300"
            >
              {post.title}
            </Link>
          </h2>

          {excerpt && (
            <p className="mb-6 text-base leading-7 text-slate-600 md:text-lg dark:text-slate-300">
              {excerpt}
            </p>
          )}

          {post.categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <CategoryBadge key={category.id} category={category} />
              ))}
            </div>
          )}

          {post.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {post.author.avatar_url ? (
                <Image
                  src={post.author.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {(post.author.display_name || 'A').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {post.author.display_name || 'Anonymous'}
                </span>
                <time dateTime={post.published_at || undefined} className="text-xs text-slate-500 dark:text-slate-400">
                  {formattedDate}
                </time>
              </div>
            </div>

            <Link
              href={`/posts/${post.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-transform duration-200 hover:gap-3 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:text-cyan-300"
            >
              Read full article
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
