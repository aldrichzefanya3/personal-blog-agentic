// src/lib/db/queries/categories.ts
// Category query functions (Requirements 12.3, 16.1, 16.2)

import { sql } from '@/lib/db/client';
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/database';

/**
 * Returns all categories ordered by name ascending.
 */
export async function getAllCategories(): Promise<Category[]> {
  const rows = await sql<Category[]>`
    SELECT id, name, slug, created_at
    FROM public.categories
    ORDER BY name ASC
  `;
  return rows;
}

/**
 * Returns the category matching the given slug, or null if not found.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const rows = await sql<Category[]>`
    SELECT id, name, slug, created_at
    FROM public.categories
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Inserts a new category and returns the created row.
 */
export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const rows = await sql<Category[]>`
    INSERT INTO public.categories (name, slug)
    VALUES (${input.name}, ${input.slug})
    RETURNING id, name, slug, created_at
  `;
  return rows[0];
}

/**
 * Updates an existing category by id and returns the updated row,
 * or null if no row was found.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category | null> {
  // Build SET clause only for provided fields
  const rows = await sql<Category[]>`
    UPDATE public.categories
    SET
      name       = COALESCE(${input.name ?? null}, name),
      slug       = COALESCE(${input.slug ?? null}, slug)
    WHERE id = ${id}
    RETURNING id, name, slug, created_at
  `;
  return rows[0] ?? null;
}

/**
 * Deletes the category with the given id.
 * Returns true if a row was deleted, false otherwise.
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    DELETE FROM public.categories
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Checks whether a category with the given name already exists,
 * using case-insensitive comparison (Req 16.1, 16.2).
 *
 * @param name      - The name to check.
 * @param excludeId - Optional category id to exclude from the check (for update scenarios).
 */
export async function categoryNameExists(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = excludeId
    ? await sql<{ id: string }[]>`
        SELECT id FROM public.categories
        WHERE lower(name) = lower(${name})
          AND id <> ${excludeId}
        LIMIT 1
      `
    : await sql<{ id: string }[]>`
        SELECT id FROM public.categories
        WHERE lower(name) = lower(${name})
        LIMIT 1
      `;
  return rows.length > 0;
}
