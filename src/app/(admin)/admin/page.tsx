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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {label}
      </h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyles(
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
      <p className="text-gray-600 dark:text-gray-400 text-sm py-4">
        No posts found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
        >
          <div className="flex-1 min-w-0 mr-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {post.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
  // Wrap dashboard data fetching in unstable_cache for performance
  // Tagged with ['admin-stats'] so we can revalidate on content changes
  const getCachedDashboardData = unstable_cache(
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
    }
  );

  // Fetch dashboard data (Req 10.1, 10.2)
  // If either fetch fails, catch the error and show error UI without partial data (Req 10.4)
  let stats;
  let recentPosts;

  try {
    const data = await getCachedDashboardData();
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
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Dashboard
      </h1>

      {/* Statistics Section (Req 10.1) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Platform Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Draft Posts" value={stats.drafts} />
          <StatCard label="Published Posts" value={stats.published} />
          <StatCard label="Archived Posts" value={stats.archived} />
          <StatCard label="Categories" value={stats.categories} />
          <StatCard label="Tags" value={stats.tags} />
          <StatCard label="Media Items" value={stats.media} />
        </div>
      </div>

      {/* Recent Posts Section (Req 10.2) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Posts
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RecentPostsList posts={recentPosts} />
        </div>
      </div>
    </div>
  );
}
