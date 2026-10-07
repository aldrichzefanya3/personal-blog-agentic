/**
 * Admin tag management page.
 * Task 18.2 - Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 *
 * Provides inline create/edit/delete controls for tags.
 * Displays validation errors returned from Server Actions.
 */

import { requireRole } from '@/lib/authz/guards';
import { getAllTags } from '@/lib/db/queries/tags';
import { TagList } from './tag-list';

export default async function TagsPage() {
  // Require EDITOR or ADMIN role (tag:write permission)
  await requireRole('tag:write');

  const tags = await getAllTags();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Tags
        </h1>
      </div>

      <TagList tags={tags} />
    </div>
  );
}
