import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getPublishedPostsByCategory } from '@/lib/db/queries/posts';
import { PostList } from '@/components/blog/PostList';
import { Pagination } from '@/components/blog/Pagination';
import { generateCategoryMetadata } from '@/lib/seo/metadata';
import type { Metadata } from 'next';

// Force dynamic rendering — this page reads searchParams and makes DB calls.
export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

/**
 * Generate metadata for the category page (Req 3.1, 3.2, 3.3, 3.6)
 */
export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const page = searchParamsResolved.page ? parseInt(searchParamsResolved.page, 10) : 1;
  
  // Capitalize category name from slug for display
  const categoryName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return generateCategoryMetadata(categoryName, slug, page);
}

/**
 * Category filter page - displays paginated list of published posts for a specific category with ISR.
 *
 * Requirements:
 * - Filter by category (Req 1.5)
 * - Paginated list of 10 published posts (Req 1.1, 5.5)
 * - ISR with 60s revalidation (Req 5.1, 5.3)
 * - Return 404 if page > totalPages (Req 1.9)
 * - Show empty-state message (not 404) when no posts exist for the filter (Req 1.10)
 * - Server Component for SEO (Req 5.2)
 */
export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const pageParam = searchParamsResolved.page;
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Validate page number
  if (isNaN(page) || page < 1) {
    notFound();
  }

  // Wrap getPublishedPostsByCategory in unstable_cache for ISR caching
  // Tagged with ['posts-category-<slug>'] for granular revalidation
  const getCachedPublishedPostsByCategory = unstable_cache(
    async (categorySlug: string, pageNum: number) => {
      return getPublishedPostsByCategory({
        categorySlug,
        page: pageNum,
        pageSize: 10,
      });
    },
    [`posts-category-${slug}`],
    {
      tags: [`posts-category-${slug}`],
      revalidate: 60,
    }
  );

  const result = await getCachedPublishedPostsByCategory(slug, page);

  // If page exceeds total pages and there are posts, return 404 (Req 1.9)
  if (page > result.totalPages && result.totalPages > 0) {
    notFound();
  }

  // Capitalize category name from slug for display
  const categoryName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="bg-slate-50/80 dark:bg-slate-950/30">
      <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <header className="mb-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
            Category
          </p>
          <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl">
            {categoryName}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            Posts in the {categoryName} category, curated for readers interested in this topic.
          </p>
        </header>

        <div className="space-y-8">
          <PostList
            posts={result.data}
            emptyMessage={`No posts found in the ${categoryName} category.`}
          />

          {result.totalPages > 1 && (
            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              basePath={`/categories/${slug}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
