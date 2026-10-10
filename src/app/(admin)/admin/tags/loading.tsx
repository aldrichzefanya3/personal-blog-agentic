/**
 * Tags page loading skeleton.
 */

import { SkeletonLine, SkeletonRow } from '@/components/admin/Skeleton';

export default function TagsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-9 w-16 animate-pulse" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
