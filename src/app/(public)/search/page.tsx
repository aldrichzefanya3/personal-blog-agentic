import { searchPosts } from '@/lib/db/queries/posts';
import { SearchQuerySchema } from '@/lib/validation/schemas/post';
import { PostList } from '@/components/blog/PostList';

// Dynamic Server Component - no caching (Req 2.1)
export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

/**
 * Search page - displays search results based on query parameter.
 *
 * Requirements:
 * - Validate query with SearchQuerySchema (1-200 chars) (Req 2.2)
 * - Call searchPosts with limit 20 (Req 2.1)
 * - Display results ordered by relevance then date (Req 2.3)
 * - Show "no results" message when empty (Req 2.4)
 * - Show validation error UI for empty or >200 char queries (Req 2.2)
 * - Dynamic Server Component (no ISR/SSG)
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const queryParam = params.q;

  // Validate search query with Zod schema (Req 2.2)
  const validationResult = SearchQuerySchema.safeParse({ q: queryParam });

  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues[0]?.message;

    return (
      <div className="bg-slate-50/80 dark:bg-slate-950/30">
        <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
          <header className="mb-8 rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 sm:p-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
              Search
            </p>
            <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 dark:text-slate-50 sm:text-4xl">
              Search Results
            </h1>
          </header>

          <div className="flex min-h-[300px] items-center justify-center rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-900/50 dark:bg-red-900/10">
            <div className="text-center">
              <p className="text-lg font-semibold text-red-800 dark:text-red-400">
                Invalid search query
              </p>
              <p className="mt-2 text-red-600 dark:text-red-500">
                {errorMessage || 'Search query must be between 1 and 200 characters.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const query = validationResult.data.q;
  const results = await searchPosts({ query, limit: 20 });

  return (
    <div className="bg-slate-50/80 dark:bg-slate-950/30">
      <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <header className="mb-8 rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
            Search
          </p>
          <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 dark:text-slate-50 sm:text-4xl">
            Search Results
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            Found {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;.
          </p>
        </header>

        <div className="space-y-8">
          <PostList
            posts={results}
            emptyMessage={`No posts found matching "${query}".`}
          />
        </div>
      </div>
    </div>
  );
}
