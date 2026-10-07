/**
 * Admin category management page.
 * Task 18.2 - Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 *
 * Provides inline create/edit/delete controls for categories.
 * Displays validation errors returned from Server Actions.
 */

import { requireRole } from '@/lib/authz/guards';
import { getAllCategories } from '@/lib/db/queries/categories';
import { CategoryList } from './category-list';

export default async function CategoriesPage() {
  // Require EDITOR or ADMIN role (category:write permission)
  await requireRole('category:write');

  const categories = await getAllCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Categories
        </h1>
      </div>

      <CategoryList categories={categories} />
    </div>
  );
}
