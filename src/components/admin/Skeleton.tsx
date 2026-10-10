/**
 * Reusable skeleton shimmer component for admin loading states.
 *
 * Used by loading.tsx files in each admin sub-route to provide instant
 * skeleton UIs while the server streams in the page content.
 */

export function SkeletonLine({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="h-10 w-10 rounded-xl" />
      </div>
      <SkeletonLine className="h-8 w-16" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
      <SkeletonLine className="h-6 w-20 rounded-full" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <SkeletonLine className="h-4 w-48" />
          <SkeletonLine className="h-3 w-32" />
        </div>
      </td>
      <td className="px-6 py-4">
        <SkeletonLine className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <SkeletonLine className="h-4 w-24" />
      </td>
      <td className="px-6 py-4 text-right">
        <SkeletonLine className="ml-auto h-4 w-8" />
      </td>
    </tr>
  );
}

/** Page-level header skeleton (matches the dashboard header card style) */
export function SkeletonPageHeader() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-9 w-48" />
        </div>
        <SkeletonLine className="h-4 w-40" />
      </div>
    </div>
  );
}
