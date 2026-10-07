/**
 * Admin dashboard page.
 *
 * Displays aggregate statistics about the platform content and shows
 * the 5 most recently updated posts.
 *
 * Requirements: 10.1, 10.2, 10.4
 *
 * Req 10.1 — Display aggregate counts of posts by status, categories, tags, and media items
 * Req 10.2 — Display the 5 most recently updated posts with title, status, and updated_at
 * Req 10.4 — Show error UI if data fetch fails without revealing partial counts
 */

import { unstable_cache } from 'next/cache';
import { getDashboardStats, getRecentPosts } from '@/lib/db/queries/posts';
import type { Post, PostStatus } from '@/types/database';

/**
 * Formats an ISO 8601 timestamp to a human-readable date/time string.
 *
 * Example: "2024-01-15T10:30:00Z" → "Jan 15, 2024 at 10:30 AM"
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns styling classes for a status badge based on the post status.
 */
function getStatusBadgeStyles(status: PostStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

/**
 * Stat card component to display a single aggregate metric.
 */
function StatCard({ label, value }: { label: string; value: number }) {
  const accentMap: Record<string, string> = {
    'Draft Posts': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'Published Posts': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Archived Posts': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    Categories: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    Tags: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    'Media Items': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  };

  const iconGlyphs: Record<string, string> = {
    'Draft Posts': '●',
    'Published Posts': '●',
    'Archived Posts': '●',
    Categories: '●',
    Tags: '●',
    'Media Items': '●',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </h3>
        <span
          aria-label={`${label}: ${value}`}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-semibold ${accentMap[label] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
        >
          {iconGlyphs[label] ?? '•'}
        </span>
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

/**
 * Status badge component to display a post's status.
 */
function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${getStatusBadgeStyles(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

/**
 * Recent posts list component.
 */
function RecentPostsList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="py-4 text-sm text-slate-600 dark:text-slate-400">
        No posts found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70"
        >
          <div className="min-w-0 flex-1 pr-2">
            <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {post.title}
            </h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Updated {formatDateTime(post.updated_at)}
            </p>
          </div>
          <StatusBadge status={post.status} />
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component shown when data fetching fails.
 *
 * Per Req 10.4, this error UI does not reveal partial counts or any
 * platform statistics.
 */
function DashboardError() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Dashboard Unavailable
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The dashboard data could not be loaded at this time. Please try again
          later.
        </p>
      </div>
    </div>
  );
}

/**
 * Admin dashboard page component.
 *
 * Server Component that fetches and displays dashboard statistics and recent posts.
 * All data fetching happens at request time on the server.
 *
 * Error handling per Req 10.4: If either data fetch fails, the entire dashboard
 * shows an error state without revealing any partial statistics.
 */
export default async function AdminDashboardPage() {
  const getDashboardData = async () => {
    if (process.env.NODE_ENV === 'test') {
      const [stats, recentPosts] = await Promise.all([
        getDashboardStats(),
        getRecentPosts(5),
      ]);
      return { stats, recentPosts };
    }

    // Wrap dashboard data fetching in unstable_cache for performance
    // Tagged with ['admin-stats'] so we can revalidate on content changes
    const cachedFetcher = unstable_cache(
      async () => {
        const [stats, recentPosts] = await Promise.all([
          getDashboardStats(),
          getRecentPosts(5),
        ]);
        return { stats, recentPosts };
      },
      ['admin-dashboard'],
      {
        tags: ['admin-stats'],
        revalidate: 60,
      },
    );

    return cachedFetcher();
  };

  // Fetch dashboard data (Req 10.1, 10.2)
  // If either fetch fails, catch the error and show error UI without partial data (Req 10.4)
  let stats;
  let recentPosts;

  try {
    const data = await getDashboardData();
    stats = data.stats;
    recentPosts = data.recentPosts;
  } catch (error) {
    // Log error for debugging but do not expose details to UI
    console.error('Dashboard data fetch failed:', error);
    // Return error state without revealing any counts (Req 10.4)
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Dashboard
        </h1>
        <DashboardError />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              Overview
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Content metrics at a glance
          </p>
        </div>
      </header>

      {/* Statistics Section (Req 10.1) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Platform Statistics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Draft Posts" value={stats.drafts} />
          <StatCard label="Published Posts" value={stats.published} />
          <StatCard label="Archived Posts" value={stats.archived} />
          <StatCard label="Categories" value={stats.categories} />
          <StatCard label="Tags" value={stats.tags} />
          <StatCard label="Media Items" value={stats.media} />
        </div>
      </section>

      {/* Recent Posts Section (Req 10.2) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recent Posts
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <RecentPostsList posts={recentPosts} />
        </div>
      </section>
    </div>
  );
}
