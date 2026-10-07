// src/lib/db/queries/tags.ts
// Tag query functions (Requirements 12.3, 16.1, 16.2)

import { sql } from '@/lib/db/client';
import type { Tag, CreateTagInput, UpdateTagInput } from '@/types/database';

/**
 * Returns all tags ordered by name ascending.
 */
export async function getAllTags(): Promise<Tag[]> {
  const rows = await sql<Tag[]>`
    SELECT id, name, slug, created_at
    FROM public.tags
    ORDER BY name ASC
  `;
  return rows;
}

/**
 * Returns the tag matching the given slug, or null if not found.
 */
export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const rows = await sql<Tag[]>`
    SELECT id, name, slug, created_at
    FROM public.tags
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Inserts a new tag and returns the created row.
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  const rows = await sql<Tag[]>`
    INSERT INTO public.tags (name, slug)
    VALUES (${input.name}, ${input.slug})
    RETURNING id, name, slug, created_at
  `;
  return rows[0];
}

/**
 * Updates an existing tag by id and returns the updated row,
 * or null if no row was found.
 */
export async function updateTag(
  id: string,
  input: UpdateTagInput,
): Promise<Tag | null> {
  const rows = await sql<Tag[]>`
    UPDATE public.tags
    SET
      name = COALESCE(${input.name ?? null}, name),
      slug = COALESCE(${input.slug ?? null}, slug)
    WHERE id = ${id}
    RETURNING id, name, slug, created_at
  `;
  return rows[0] ?? null;
}

/**
 * Deletes the tag with the given id.
 * Returns true if a row was deleted, false otherwise.
 */
export async function deleteTag(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    DELETE FROM public.tags
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Checks whether a tag with the given name already exists,
 * using case-insensitive comparison (Req 16.1, 16.2).
 *
 * @param name      - The name to check.
 * @param excludeId - Optional tag id to exclude from the check (for update scenarios).
 */
export async function tagNameExists(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = excludeId
    ? await sql<{ id: string }[]>`
        SELECT id FROM public.tags
        WHERE lower(name) = lower(${name})
          AND id <> ${excludeId}
        LIMIT 1
      `
    : await sql<{ id: string }[]>`
        SELECT id FROM public.tags
        WHERE lower(name) = lower(${name})
        LIMIT 1
      `;
  return rows.length > 0;
}
