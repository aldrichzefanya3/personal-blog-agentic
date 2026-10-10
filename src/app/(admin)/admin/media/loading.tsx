/**
 * Media library page loading skeleton.
 */

import { SkeletonLine } from '@/components/admin/Skeleton';

function MediaCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="aspect-square bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-2 p-3">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export default function MediaLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <SkeletonLine className="mb-6 h-9 w-44 animate-pulse" />

      {/* Upload area skeleton */}
      <div className="mb-8 animate-pulse rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <SkeletonLine className="mx-auto h-4 w-48" />
      </div>

      <SkeletonLine className="mb-4 h-7 w-52 animate-pulse" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
