/**
 * Profile page loading skeleton.
 */

import { SkeletonLine } from '@/components/admin/Skeleton';

function FieldSkeleton() {
  return (
    <div className="space-y-1">
      <SkeletonLine className="h-4 w-24" />
      <SkeletonLine className="h-10 w-full rounded-lg" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <SkeletonLine className="h-3 w-16 animate-pulse" />
        <SkeletonLine className="h-9 w-44 animate-pulse" />
      </header>

      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="space-y-5">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <div className="pt-2">
            <SkeletonLine className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
