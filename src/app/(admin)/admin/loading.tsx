/**
 * Dashboard page loading skeleton.
 *
 * Next.js shows this instantly while the server streams the dashboard page,
 * making navigation to the dashboard feel immediate.
 */

import {
  SkeletonPageHeader,
  SkeletonCard,
  SkeletonRow,
  SkeletonLine,
} from '@/components/admin/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <SkeletonPageHeader />

      {/* Statistics skeleton */}
      <section className="space-y-4">
        <SkeletonLine className="h-6 w-44" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>

      {/* Recent posts skeleton */}
      <section className="space-y-4">
        <SkeletonLine className="h-6 w-32" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
