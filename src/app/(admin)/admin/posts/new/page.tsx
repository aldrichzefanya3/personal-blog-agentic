/**
 * Create new post page.
 * Subtask 17.5 - Requirement 11.1
 */

import { requireRole } from '@/lib/authz/guards';
import { getAllCategories } from '@/lib/db/queries/categories';
import { getAllTags } from '@/lib/db/queries/tags';
import { PostForm } from '@/components/admin/PostForm';
import { createPostAction } from '@/actions/posts';

export default async function NewPostPage() {
  // Require EDITOR or ADMIN role
  await requireRole('post:create');

  // Fetch categories and tags for the form
  const [categories, tags] = await Promise.all([
    getAllCategories(),
    getAllTags(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Create New Post
      </h1>

      <PostForm
        categories={categories}
        tags={tags}
        actions={{
          createPost: createPostAction,
        }}
      />
    </div>
  );
}
