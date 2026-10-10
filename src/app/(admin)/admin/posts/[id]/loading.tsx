/**
 * Post editor (new/edit) page loading skeleton.
 */

import { SkeletonLine } from '@/components/admin/Skeleton';

function EditorAreaSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLine key={i} className="h-8 w-8 rounded" />
        ))}
      </div>
      <SkeletonLine className="h-64 w-full rounded-lg" />
    </div>
  );
}

export default function PostEditorLoading() {
  return (
    <div className="space-y-6">
      <SkeletonLine className="h-9 w-48 animate-pulse" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content column */}
        <div className="space-y-4 lg:col-span-2">
          <div className="animate-pulse space-y-2">
            <SkeletonLine className="h-4 w-12" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
          </div>
          <div className="animate-pulse space-y-2">
            <SkeletonLine className="h-4 w-12" />
            <SkeletonLine className="h-10 w-full rounded-xl" />
          </div>
          <div className="animate-pulse space-y-2">
            <SkeletonLine className="h-4 w-18" />
            <EditorAreaSkeleton />
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3">
            <SkeletonLine className="h-5 w-20" />
            <SkeletonLine className="h-10 w-full rounded-lg" />
            <SkeletonLine className="h-10 w-full rounded-lg" />
          </div>
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3">
            <SkeletonLine className="h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <SkeletonLine className="h-4 w-4 rounded" />
                <SkeletonLine className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
