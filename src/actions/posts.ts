'use server';

/**
 * Post management Server Actions.
 * Subtask 17.4 - Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 8.9
 */

import { redirect } from 'next/navigation';
import { requireRole, requireOwnership } from '@/lib/authz/guards';
import { generateSlug, ensureUniqueSlug } from '@/lib/slug';
import { CreatePostSchema, UpdatePostSchema } from '@/lib/validation/schemas/post';
import {
  createPost,
  updatePost,
  publishPost as publishPostQuery,
  unpublishPost as unpublishPostQuery,
  archivePost as archivePostQuery,
  deletePost as deletePostQuery,
  getPostById,
  postSlugExists,
} from '@/lib/db/queries/posts';
import { safeRevalidateTag, safeRevalidateTags } from '@/lib/cache/revalidation';

/**
 * Creates a new post as DRAFT.
 * Requirements: 11.1, 11.9, 11.10, 11.11
 */
export async function createPostAction(
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    // Require EDITOR or ADMIN role
    const session = await requireRole('post:create');

    // Parse and validate form data
    const rawData = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      excerpt: formData.get('excerpt') as string,
      cover_image_url: formData.get('cover_image_url') as string,
      category_ids: JSON.parse(
        (formData.get('category_ids') as string) || '[]',
      ),
      tag_ids: JSON.parse((formData.get('tag_ids') as string) || '[]'),
    };

    const parseResult = CreatePostSchema.safeParse(rawData);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return {
        error: `Validation failed: ${firstError.path.join('.')} - ${firstError.message}`,
      };
    }

    const validatedData = parseResult.data;

    // Generate slug from title
    const baseSlug = generateSlug(validatedData.title);

    // Ensure slug is unique
    const uniqueSlug = await ensureUniqueSlug(baseSlug, postSlugExists);

    // Create post
    const post = await createPost({
      title: validatedData.title,
      slug: uniqueSlug,
      excerpt: validatedData.excerpt,
      content: validatedData.content,
      cover_image_url: validatedData.cover_image_url,
      category_ids: validatedData.category_ids,
      tag_ids: validatedData.tag_ids,
      author_id: session.id,
      status: 'DRAFT',
    });

    // Revalidate posts cache (Req 5.3, 5.7)
    safeRevalidateTags(['posts', 'admin-stats']);

    // Redirect to edit page
    redirect(`/admin/posts/${post.id}`);
  } catch (error) {
    // If redirect was called, it throws a special error that should propagate
    if (
      error instanceof Error &&
      error.message.includes('NEXT_REDIRECT')
    ) {
      throw error;
    }

    console.error('createPostAction error:', error);

    // Return error for non-redirect errors
    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: 'Failed to create post' };
  }
}

/**
 * Updates an existing post.
 * Requirements: 11.2, 11.8, 11.9, 11.10
 */
export async function updatePostAction(
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const postId = formData.get('id') as string;

    if (!postId) {
      return { error: 'Post ID is required' };
    }

    // Fetch the post to check ownership
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return { error: 'Post not found' };
    }

    // Require ownership or ADMIN role
    await requireOwnership(existingPost.author_id, 'post:edit');

    // Parse and validate form data
    const rawData = {
      title: formData.get('title') as string,
      slug: formData.get('slug') as string,
      content: formData.get('content') as string,
      excerpt: formData.get('excerpt') as string,
      cover_image_url: formData.get('cover_image_url') as string,
      category_ids: JSON.parse(
        (formData.get('category_ids') as string) || '[]',
      ),
      tag_ids: JSON.parse((formData.get('tag_ids') as string) || '[]'),
    };

    const parseResult = UpdatePostSchema.safeParse(rawData);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return {
        error: `Validation failed: ${firstError.path.join('.')} - ${firstError.message}`,
      };
    }

    const validatedData = parseResult.data;

    // If slug changed, ensure uniqueness
    let finalSlug = validatedData.slug;
    if (finalSlug && finalSlug !== existingPost.slug) {
      finalSlug = await ensureUniqueSlug(finalSlug, postSlugExists, postId);
    }

    // Update post
    await updatePost(postId, {
      ...validatedData,
      slug: finalSlug,
    });

    // Revalidate caches (Req 5.3, 5.7)
    const tagsToRevalidate = ['posts', `post-${existingPost.slug}`, 'admin-stats'];
    if (finalSlug && finalSlug !== existingPost.slug) {
      tagsToRevalidate.push(`post-${finalSlug}`);
    }
    safeRevalidateTags(tagsToRevalidate);

    return {};
  } catch (error) {
    console.error('updatePostAction error:', error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: 'Failed to update post' };
  }
}

/**
 * Publishes a post (sets status=PUBLISHED, published_at=now() if null).
 * Requirement: 11.3
 */
export async function publishPostAction(
  postId: string,
): Promise<{ error?: string }> {
  try {
    // Fetch the post to check ownership
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return { error: 'Post not found' };
    }

    // Require ownership or ADMIN role
    await requireOwnership(existingPost.author_id, 'post:edit');

    // Publish post
    await publishPostQuery(postId);

    // Revalidate caches (Req 5.3, 5.7)
    safeRevalidateTags(['posts', `post-${existingPost.slug}`, 'admin-stats']);

    return {};
  } catch (error) {
    console.error('publishPostAction error:', error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: 'Failed to publish post' };
  }
}

/**
 * Unpublishes a post (sets status=DRAFT, keeps published_at).
 * Requirement: 11.4
 */
export async function unpublishPostAction(
  postId: string,
): Promise<{ error?: string }> {
  try {
    // Fetch the post to check ownership
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return { error: 'Post not found' };
    }

    // Require ownership or ADMIN role
    await requireOwnership(existingPost.author_id, 'post:edit');

    // Unpublish post
    await unpublishPostQuery(postId);

    // Revalidate caches (Req 5.3, 5.7)
    safeRevalidateTags(['posts', `post-${existingPost.slug}`, 'admin-stats']);

    return {};
  } catch (error) {
    console.error('unpublishPostAction error:', error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: 'Failed to unpublish post' };
  }
}

/**
 * Archives a post (sets status=ARCHIVED).
 * Requirement: 11.5
 */
export async function archivePostAction(
  postId: string,
): Promise<{ error?: string }> {
  try {
    // Fetch the post to check ownership
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return { error: 'Post not found' };
    }

    // Require ownership or ADMIN role
    await requireOwnership(existingPost.author_id, 'post:edit');

    // Archive post
    await archivePostQuery(postId);

    // Revalidate caches (Req 5.3, 5.7)
    safeRevalidateTags(['posts', `post-${existingPost.slug}`, 'admin-stats']);

    return {};
  } catch (error) {
    console.error('archivePostAction error:', error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: 'Failed to archive post' };
  }
}

/**
 * Deletes a post permanently (cascades to post_categories/post_tags).
 * Requirement: 11.6
 */
export async function deletePostAction(
  postId: string,
): Promise<{ error?: string }> {
  try {
    // Fetch the post to check ownership
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return { error: 'Post not found' };
    }

    // Require ownership or ADMIN role (for delete, use stricter permission)
    await requireOwnership(existingPost.author_id, 'post:delete');

    // Delete post (cascades to join tables)
    await deletePostQuery(postId);

    // Revalidate caches (Req 5.3, 5.7)
    safeRevalidateTags(['posts', `post-${existingPost.slug}`, 'admin-stats']);

    // Redirect to posts list
    redirect('/admin/posts');
  } catch (error) {
    // If redirect was called, it throws a special error that should propagate
    if (
      error instanceof Error &&
      error.message.includes('NEXT_REDIRECT')
    ) {
      throw error;
    }

    console.error('deletePostAction error:', error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: 'Failed to delete post' };
  }
}
