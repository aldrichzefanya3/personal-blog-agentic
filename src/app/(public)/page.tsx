import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublishedPosts } from '@/lib/db/queries/posts';
import { PostList } from '@/components/blog/PostList';
import { Pagination } from '@/components/blog/Pagination';
import { Hero } from '@/components/blog/Hero';
import { generateHomeMetadata } from '@/lib/seo/metadata';
import type { Metadata } from 'next';

// Enable ISR with 60 second revalidation (Req 5.1, 5.3)
export const revalidate = 60;

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

/**
 * Generate metadata for the home page (Req 3.1, 3.2, 3.3, 3.6)
 */
export async function generateMetadata({
  searchParams,
}: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  return generateHomeMetadata(page);
}

/**
 * Home page - displays hero section and paginated list of published posts with ISR.
 *
 * Requirements:
 * - Paginated list of 10 published posts (Req 1.1, 5.5)
 * - ISR with 60s revalidation (Req 5.1, 5.3)
 * - Return 404 if page > totalPages (Req 1.9)
 * - Server Component for SEO (Req 5.2)
 * - Enhanced homepage with hero and featured post (Task 25.2)
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const pageParam = params.page;
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Validate page number
  if (isNaN(page) || page < 1) {
    notFound();
  }

  // Wrap getPublishedPosts in unstable_cache for ISR caching
  // Tagged with ['posts'] so we can revalidate on post changes
  const getCachedPublishedPosts = unstable_cache(
    async (pageNum: number) => {
      return getPublishedPosts({ page: pageNum, pageSize: 10 });
    },
    ['published-posts'],
    {
      tags: ['posts'],
      revalidate: 60,
    }
  );

  const result = await getCachedPublishedPosts(page);

  // If page exceeds total pages and there are posts, return 404 (Req 1.9)
  if (page > result.totalPages && result.totalPages > 0) {
    notFound();
  }

  return (
    <>
      {page === 1 && <Hero />}

      <div className="bg-slate-50/80 dark:bg-slate-950/30" id="posts">
        <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
          {page !== 1 && (
            <header className="mb-8 rounded-[1.5rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                Archive
              </p>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 dark:text-slate-50 sm:text-4xl">
                Latest Posts
              </h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
                Discover recent writing, stories, and ideas.
              </p>
            </header>
          )}

          <div className="space-y-8">
            <PostList
              posts={result.data}
              emptyMessage="Check back soon for new content!"
              showFeatured={page === 1}
            />

            {result.totalPages > 1 && (
              <Pagination
                currentPage={result.page}
                totalPages={result.totalPages}
                basePath=""
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
