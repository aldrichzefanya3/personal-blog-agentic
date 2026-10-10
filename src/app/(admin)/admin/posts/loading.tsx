/**
 * Posts page loading skeleton.
 */

import { SkeletonLine, SkeletonTableRow } from '@/components/admin/Skeleton';

export default function PostsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-9 w-24 animate-pulse" />
        <SkeletonLine className="h-10 w-40 animate-pulse rounded-xl" />
      </div>

      <div className="overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {['Title', 'Status', 'Updated', 'Actions'].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
