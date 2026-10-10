/**
 * Settings (User Management) page loading skeleton.
 */

import { SkeletonLine } from '@/components/admin/Skeleton';

function UserRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <SkeletonLine className="h-4 w-36" />
      </td>
      <td className="px-6 py-4">
        <SkeletonLine className="h-4 w-48" />
      </td>
      <td className="px-6 py-4">
        <SkeletonLine className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-6 py-4 text-right">
        <SkeletonLine className="ml-auto h-8 w-24 rounded-lg" />
      </td>
    </tr>
  );
}

export default function SettingsLoading() {
  return (
    <div>
      <div className="mb-8 animate-pulse space-y-2">
        <SkeletonLine className="h-9 w-56" />
        <SkeletonLine className="h-4 w-96" />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {['Name', 'Email', 'Role', 'Actions'].map((col) => (
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
            {Array.from({ length: 5 }).map((_, i) => (
              <UserRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
