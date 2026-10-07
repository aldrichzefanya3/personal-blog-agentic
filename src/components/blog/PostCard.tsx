import Image from 'next/image';
import Link from 'next/link';
import type { PostWithRelations } from '@/types';
import { CategoryBadge } from './CategoryBadge';
import { PostCoverImage } from './PostCoverImage';
import { TagBadge } from './TagBadge';

export interface PostCardProps {
  post: PostWithRelations;
}

function getReadingTime(content: string | null) {
  const text = content ?? '';
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

/**
 * PostCard component - displays a post summary with title, excerpt, cover image,
 * author, date, categories, and tags.
 *
 * Requirements:
 * - Excerpt limited to 300 chars (Req 1.4)
 * - Date formatted as YYYY-MM-DD (Req 1.4)
 * - Cover image uses next/image with descriptive alt (Req 4.5, 5.2)
 * - All interactive elements keyboard accessible (Req 4.4, 4.8)
 */
export function PostCard({ post }: PostCardProps) {
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
  const readingTime = getReadingTime(post.content);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/90 shadow-[0_20px_45px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(14,165,233,0.12)] dark:border-slate-700 dark:bg-slate-900/90">
      {post.cover_image_url && (
        <Link
          href={`/posts/${post.slug}`}
          className="relative block overflow-hidden focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-cyan-400"
          aria-label={`Read ${post.title}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <PostCoverImage
              src={post.cover_image_url}
              alt={post.title}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
            <div className="absolute right-3 bottom-3 rounded-full border border-white/20 bg-slate-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              {readingTime} min read
            </div>
          </div>
        </Link>
      )}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {post.categories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {post.categories.slice(0, 2).map((category) => (
              <CategoryBadge key={category.id} category={category} />
            ))}
          </div>
        )}

        <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-cyan-700 dark:text-slate-50 dark:group-hover:text-cyan-300">
          <Link
            href={`/posts/${post.slug}`}
            className="focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-cyan-400"
          >
            {post.title}
          </Link>
        </h2>

        {excerpt && (
          <p className="mb-4 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {excerpt}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            {post.author?.avatar_url ? (
              <Image
                src={post.author.avatar_url}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {(post.author?.display_name || 'F').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{post.author?.display_name || 'Former contributor'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <time dateTime={post.published_at || undefined}>{formattedDate}</time>
          </div>
        </div>
      </div>
    </article>
  );
}
