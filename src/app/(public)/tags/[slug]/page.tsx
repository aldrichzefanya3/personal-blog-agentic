import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublishedPostsByTag } from '@/lib/db/queries/posts';
import { PostList } from '@/components/blog/PostList';
import { Pagination } from '@/components/blog/Pagination';
import { generateTagMetadata } from '@/lib/seo/metadata';
import type { Metadata } from 'next';

// Enable ISR with 60 second revalidation (Req 5.1, 5.3)
export const revalidate = 60;

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

/**
 * Generate metadata for the tag page (Req 3.1, 3.2, 3.3, 3.6)
 */
export async function generateMetadata({
  params,
  searchParams,
}: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const page = searchParamsResolved.page ? parseInt(searchParamsResolved.page, 10) : 1;
  
  // Capitalize tag name from slug for display
  const tagName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return generateTagMetadata(tagName, slug, page);
}

/**
 * Tag filter page - displays paginated list of published posts for a specific tag with ISR.
 *
 * Requirements:
 * - Filter by tag (Req 1.6)
 * - Paginated list of 10 published posts (Req 1.1, 5.5)
 * - ISR with 60s revalidation (Req 5.1, 5.3)
 * - Return 404 if page > totalPages (Req 1.9)
 * - Show empty-state message (not 404) when no posts exist for the filter (Req 1.10)
 * - Server Component for SEO (Req 5.2)
 */
export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const pageParam = searchParamsResolved.page;
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Validate page number
  if (isNaN(page) || page < 1) {
    notFound();
  }

  // Wrap getPublishedPostsByTag in unstable_cache for ISR caching
  // Tagged with ['posts-tag-<slug>'] for granular revalidation
  const getCachedPublishedPostsByTag = unstable_cache(
    async (tagSlug: string, pageNum: number) => {
      return getPublishedPostsByTag({
        tagSlug,
        page: pageNum,
        pageSize: 10,
      });
    },
    [`posts-tag-${slug}`],
    {
      tags: [`posts-tag-${slug}`],
      revalidate: 60,
    }
  );

  const result = await getCachedPublishedPostsByTag(slug, page);

  // If page exceeds total pages and there are posts, return 404 (Req 1.9)
  if (page > result.totalPages && result.totalPages > 0) {
    notFound();
  }

  // Capitalize tag name from slug for display
  const tagName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="bg-slate-50/80 dark:bg-slate-950/30">
      <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <header className="mb-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700 dark:text-violet-300">
            Topic
          </p>
          <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl">
            #{tagName}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            Everything tagged with {tagName}, gathered in one place for easy browsing.
          </p>
        </header>

        <div className="space-y-8">
          <PostList
            posts={result.data}
            emptyMessage={`No posts found with the ${tagName} tag.`}
          />

          {result.totalPages > 1 && (
            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              basePath={`/tags/${slug}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
