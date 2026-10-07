'use server';

/**
 * Tag Server Actions
 *
 * Requirements: 12.2, 12.3, 12.5, 12.6, 12.7
 *
 * Req 12.2 — Auto-generate slug from tag name
 * Req 12.3 — Case-insensitive duplicate name validation
 * Req 12.5 — Cascade delete of post_tags relationships
 * Req 12.6 — Validate name constraints (1-100 chars)
 * Req 12.7 — Atomic update of name and slug
 */

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/authz/guards';
import { CreateTagSchema } from '@/lib/validation/schemas/tag';
import { generateSlug } from '@/lib/slug';
import {
  createTag as dbCreateTag,
  updateTag as dbUpdateTag,
  deleteTag as dbDeleteTag,
  tagNameExists,
} from '@/lib/db/queries/tags';
import { safeRevalidateTag } from '@/lib/cache/revalidation';

/**
 * Create a new tag (Req 12.2, 12.3, 12.6)
 *
 * Flow:
 *  1. Verify user has 'tag:write' permission
 *  2. Validate input with Zod schema (Req 12.6)
 *  3. Check for case-insensitive duplicate name (Req 12.3)
 *  4. Generate slug from name (Req 12.2)
 *  5. Persist tag to database
 *  6. Revalidate admin pages
 *
 * @param formData - Form data containing tag name
 * @returns Error object if validation/creation fails, otherwise success state
 */
export async function createTagAction(formData: FormData) {
  try {
    // Step 1: Verify permission (Req 9.2)
    await requireRole('tag:write');

    // Step 2: Validate input (Req 12.6)
    const rawData = {
      name: formData.get('name')?.toString() || '',
    };

    const parsed = CreateTagSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { name } = parsed.data;

    // Step 3: Check for duplicate name (case-insensitive) (Req 12.3)
    const exists = await tagNameExists(name);

    if (exists) {
      return {
        error: 'A tag with this name already exists',
      };
    }

    // Step 4: Generate slug (Req 12.2)
    const slug = generateSlug(name);

    // Step 5: Create tag
    const tag = await dbCreateTag({ name, slug });

    // Step 6: Revalidate cache tags (Req 5.7)
    revalidatePath('/admin/tags');
    revalidatePath('/admin/posts'); // Tag selector in post form
    safeRevalidateTag('admin-stats'); // Update dashboard statistics

    return { success: true, tag };
  } catch (error) {
    console.error('createTagAction error:', error);
    return {
      error: 'Failed to create tag. Please try again.',
    };
  }
}

/**
 * Update an existing tag (Req 12.7)
 *
 * Flow:
 *  1. Verify user has 'tag:write' permission
 *  2. Validate input
 *  3. Check for case-insensitive duplicate name (excluding current tag)
 *  4. Generate new slug from new name
 *  5. Update tag atomically (both name and slug)
 *  6. Revalidate affected pages
 *
 * @param formData - Form data containing tag id and new name
 * @returns Error object if validation/update fails, otherwise success state
 */
export async function updateTagAction(formData: FormData) {
  try {
    // Step 1: Verify permission
    await requireRole('tag:write');

    // Extract and validate id
    const id = formData.get('id')?.toString();
    if (!id) {
      return { error: 'Tag ID is required' };
    }

    // Step 2: Validate input
    const rawData = {
      name: formData.get('name')?.toString() || '',
    };

    const parsed = CreateTagSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { name: newName } = parsed.data;

    // Step 3: Check for duplicate name (excluding current tag) (Req 12.3)
    const exists = await tagNameExists(newName, id);

    if (exists) {
      return {
        error: 'A tag with this name already exists',
      };
    }

    // Step 4: Generate new slug (Req 12.7)
    const newSlug = generateSlug(newName);

    // Step 5: Update tag atomically (Req 12.7)
    const tag = await dbUpdateTag(id, {
      name: newName,
      slug: newSlug,
    });

    if (!tag) {
      return { error: 'Tag not found' };
    }

    // Step 6: Revalidate affected pages and cache tags (Req 5.7)
    revalidatePath('/admin/tags');
    revalidatePath('/admin/posts');
    safeRevalidateTag('admin-stats'); // Update dashboard statistics
    // Revalidate public tag pages (old and new slugs)
    revalidatePath(`/tags/${newSlug}`);

    return { success: true, tag };
  } catch (error) {
    console.error('updateTagAction error:', error);
    return {
      error: 'Failed to update tag. Please try again.',
    };
  }
}

/**
 * Delete a tag (Req 12.5)
 *
 * Flow:
 *  1. Verify user has 'tag:write' permission
 *  2. Delete tag (cascade removes post_tags via DB constraint)
 *  3. Revalidate admin pages
 *
 * @param formData - Form data containing tag id
 * @returns Error object if deletion fails, otherwise success state
 */
export async function deleteTagAction(formData: FormData) {
  try {
    // Step 1: Verify permission
    await requireRole('tag:write');

    // Extract id
    const id = formData.get('id')?.toString();
    if (!id) {
      return { error: 'Tag ID is required' };
    }

    // Step 2: Delete tag (Req 12.5 — cascade removes post_tags)
    const deleted = await dbDeleteTag(id);

    if (!deleted) {
      return { error: 'Tag not found' };
    }

    // Step 3: Revalidate cache tags (Req 5.7)
    revalidatePath('/admin/tags');
    revalidatePath('/admin/posts');
    safeRevalidateTag('admin-stats'); // Update dashboard statistics

    return { success: true };
  } catch (error) {
    console.error('deleteTagAction error:', error);
    return {
      error: 'Failed to delete tag. Please try again.',
    };
  }
}
