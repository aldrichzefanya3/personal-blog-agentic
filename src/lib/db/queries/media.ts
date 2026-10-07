// Media query functions — Requirements 13.4, 13.7, 13.9, 16.1, 16.2

import { sql } from '@/lib/db/client';
import type {
  Media,
  CreateMediaInput,
  PaginatedResult,
} from '@/types/database';

const MAX_PAGE_SIZE = 100;

/**
 * Inserts a new media record and returns the created row. (Req 13.4)
 */
export async function createMediaRecord(
  data: CreateMediaInput,
): Promise<Media> {
  const rows = await sql<Media[]>`
    INSERT INTO public.media (uploader_id, filename, storage_path, mime_type, size_bytes)
    VALUES (
      ${data.uploader_id},
      ${data.filename},
      ${data.storage_path},
      ${data.mime_type},
      ${data.size_bytes}
    )
    RETURNING id, uploader_id, filename, storage_path, mime_type, size_bytes, created_at
  `;
  return rows[0];
}

/**
 * Returns a paginated list of media records uploaded by a given user. (Req 13.7)
 * Page size is capped at MAX_PAGE_SIZE (100).
 */
export async function getMediaByUploader(opts: {
  uploaderId: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<Media>> {
  const clampedPageSize = Math.min(opts.pageSize, MAX_PAGE_SIZE);
  const offset = (opts.page - 1) * clampedPageSize;

  const [rows, countRows] = await Promise.all([
    sql<Media[]>`
      SELECT id, uploader_id, filename, storage_path, mime_type, size_bytes, created_at
      FROM public.media
      WHERE uploader_id = ${opts.uploaderId}
      ORDER BY created_at DESC
      LIMIT ${clampedPageSize}
      OFFSET ${offset}
    `,
    sql<{ count: string }[]>`
      SELECT COUNT(*) AS count
      FROM public.media
      WHERE uploader_id = ${opts.uploaderId}
    `,
  ]);

  const total = parseInt(countRows[0].count, 10);
  const totalPages = Math.ceil(total / clampedPageSize);

  return {
    data: rows,
    total,
    page: opts.page,
    pageSize: clampedPageSize,
    totalPages,
  };
}

/**
 * Returns a single media record by id, or null if not found. (Req 16.1)
 */
export async function getMediaById(id: string): Promise<Media | null> {
  const rows = await sql<Media[]>`
    SELECT id, uploader_id, filename, storage_path, mime_type, size_bytes, created_at
    FROM public.media
    WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

/**
 * Deletes a media record by id. (Req 16.2)
 */
export async function deleteMediaRecord(id: string): Promise<void> {
  await sql`
    DELETE FROM public.media
    WHERE id = ${id}
  `;
}

/**
 * Returns true if any published or draft post references the media's storage_path
 * in either cover_image_url or content. (Req 13.9)
 *
 * First fetches the storage_path for the given mediaId, then checks posts for
 * any reference using a LIKE match on content and an exact match on cover_image_url.
 */
export async function isMediaInUse(mediaId: string): Promise<boolean> {
  // Step 1: resolve the storage_path for this media record
  const mediaRows = await sql<{ storage_path: string }[]>`
    SELECT storage_path
    FROM public.media
    WHERE id = ${mediaId}
  `;

  if (mediaRows.length === 0) {
    return false;
  }

  const { storage_path } = mediaRows[0];
  const likePattern = `%${storage_path}%`;

  // Step 2: check if any post references this storage_path
  const postRows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM public.posts
      WHERE cover_image_url = ${storage_path}
         OR content LIKE ${likePattern}
    ) AS exists
  `;

  return postRows[0].exists;
}
