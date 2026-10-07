'use server';

/**
 * Category Server Actions
 *
 * Requirements: 12.1, 12.3, 12.4, 12.7
 *
 * Req 12.1 — Auto-generate slug from category name
 * Req 12.3 — Case-insensitive duplicate name validation
 * Req 12.4 — Cascade delete of post_categories relationships
 * Req 12.7 — Atomic update of name and slug
 */

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/authz/guards';
import { CreateCategorySchema } from '@/lib/validation/schemas/category';
import { generateSlug } from '@/lib/slug';
import {
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  categoryNameExists,
} from '@/lib/db/queries/categories';
import { safeRevalidateTag } from '@/lib/cache/revalidation';

/**
 * Create a new category (Req 12.1, 12.3)
 *
 * Flow:
 *  1. Verify user has 'category:write' permission
 *  2. Validate input with Zod schema
 *  3. Check for case-insensitive duplicate name
 *  4. Generate slug from name
 *  5. Persist category to database
 *  6. Revalidate admin pages
 *
 * @param formData - Form data containing category name
 * @returns Error object if validation/creation fails, otherwise success state
 */
export async function createCategoryAction(formData: FormData) {
  try {
    // Step 1: Verify permission (Req 9.2)
    await requireRole('category:write');

    // Step 2: Validate input
    const rawData = {
      name: formData.get('name')?.toString() || '',
    };

    const parsed = CreateCategorySchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { name } = parsed.data;

    // Step 3: Check for duplicate name (case-insensitive) (Req 12.3)
    const exists = await categoryNameExists(name);

    if (exists) {
      return {
        error: 'A category with this name already exists',
      };
    }

    // Step 4: Generate slug (Req 12.1)
    const slug = generateSlug(name);

    // Step 5: Create category
    const category = await dbCreateCategory({ name, slug });

    // Step 6: Revalidate cache tags (Req 5.7)
    revalidatePath('/admin/categories');
    revalidatePath('/admin/posts'); // Category selector in post form
    safeRevalidateTag('admin-stats'); // Update dashboard statistics

    return { success: true, category };
  } catch (error) {
    console.error('createCategoryAction error:', error);
    return {
      error: 'Failed to create category. Please try again.',
    };
  }
}

/**
 * Update an existing category (Req 12.7)
 *
 * Flow:
 *  1. Verify user has 'category:write' permission
 *  2. Validate input
 *  3. Check for case-insensitive duplicate name (excluding current category)
 *  4. Generate new slug from new name
 *  5. Update category atomically (both name and slug)
 *  6. Revalidate affected pages
 *
 * @param formData - Form data containing category id and new name
 * @returns Error object if validation/update fails, otherwise success state
 */
export async function updateCategoryAction(formData: FormData) {
  try {
    // Step 1: Verify permission
    await requireRole('category:write');

    // Extract and validate id
    const id = formData.get('id')?.toString();
    if (!id) {
      return { error: 'Category ID is required' };
    }

    // Step 2: Validate input
    const rawData = {
      name: formData.get('name')?.toString() || '',
    };

    const parsed = CreateCategorySchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { name: newName } = parsed.data;

    // Step 3: Check for duplicate name (excluding current category) (Req 12.3)
    const exists = await categoryNameExists(newName, id);

    if (exists) {
      return {
        error: 'A category with this name already exists',
      };
    }

    // Step 4: Generate new slug (Req 12.7)
    const newSlug = generateSlug(newName);

    // Step 5: Update category atomically (Req 12.7)
    const category = await dbUpdateCategory(id, {
      name: newName,
      slug: newSlug,
    });

    if (!category) {
      return { error: 'Category not found' };
    }

    // Step 6: Revalidate affected pages and cache tags (Req 5.7)
    revalidatePath('/admin/categories');
    revalidatePath('/admin/posts');
    safeRevalidateTag('admin-stats'); // Update dashboard statistics
    // Revalidate public category pages (old and new slugs)
    revalidatePath(`/categories/${newSlug}`);

    return { success: true, category };
  } catch (error) {
    console.error('updateCategoryAction error:', error);
    return {
      error: 'Failed to update category. Please try again.',
    };
  }
}

/**
 * Delete a category (Req 12.4)
 *
 * Flow:
 *  1. Verify user has 'category:write' permission
 *  2. Delete category (cascade removes post_categories via DB constraint)
 *  3. Revalidate admin pages
 *
 * @param formData - Form data containing category id
 * @returns Error object if deletion fails, otherwise success state
 */
export async function deleteCategoryAction(formData: FormData) {
  try {
    // Step 1: Verify permission
    await requireRole('category:write');

    // Extract id
    const id = formData.get('id')?.toString();
    if (!id) {
      return { error: 'Category ID is required' };
    }

    // Step 2: Delete category (Req 12.4 — cascade removes post_categories)
    const deleted = await dbDeleteCategory(id);

    if (!deleted) {
      return { error: 'Category not found' };
    }

    // Step 3: Revalidate cache tags (Req 5.7)
    revalidatePath('/admin/categories');
    revalidatePath('/admin/posts');
    safeRevalidateTag('admin-stats'); // Update dashboard statistics

    return { success: true };
  } catch (error) {
    console.error('deleteCategoryAction error:', error);
    return {
      error: 'Failed to delete category. Please try again.',
    };
  }
}
