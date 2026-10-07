/**
 * Edit post page.
 * Subtask 17.5 - Requirements 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/authz/guards';
import { getPostByIdWithRelations } from '@/lib/db/queries/posts';
import { getAllCategories } from '@/lib/db/queries/categories';
import { getAllTags } from '@/lib/db/queries/tags';
import { PostForm } from '@/components/admin/PostForm';
import {
  updatePostAction,
  publishPostAction,
  unpublishPostAction,
  archivePostAction,
  deletePostAction,
} from '@/actions/posts';

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  // Require EDITOR or ADMIN role
  await requireRole('post:edit');

  const { id } = await params;

  // Fetch the post with relations
  const post = await getPostByIdWithRelations(id);

  if (!post) {
    notFound();
  }

  // Fetch categories and tags for the form
  const [categories, tags] = await Promise.all([
    getAllCategories(),
    getAllTags(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Edit Post
      </h1>

      <PostForm
        post={post}
        categories={categories}
        tags={tags}
        actions={{
          updatePost: updatePostAction,
          publishPost: publishPostAction,
          unpublishPost: unpublishPostAction,
          archivePost: archivePostAction,
          deletePost: deletePostAction,
        }}
      />
    </div>
  );
}
