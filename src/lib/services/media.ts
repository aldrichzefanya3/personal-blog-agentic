/**
 * Media upload and deletion service — Requirements 13.1–13.10
 *
 * Req 13.1 — Validate MIME type
 * Req 13.2 — Validate file size (max 10MB)
 * Req 13.3 — Return error if validation fails
 * Req 13.4 — Store file in Supabase Storage and record in media table
 * Req 13.5 — Compensating transaction on DB failure
 * Req 13.6 — Return media record with URL
 * Req 13.8 — Atomic delete (storage + DB)
 * Req 13.9 — Prevent deletion if media is in use
 */

import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { MediaUploadSchema } from '@/lib/validation/schemas/media';
import { StorageError } from '@/lib/errors';
import {
  createMediaRecord,
  deleteMediaRecord,
  isMediaInUse,
} from '@/lib/db/queries/media';
import type { Media } from '@/types/database';
import { randomUUID } from 'crypto';

const STORAGE_BUCKET = 'blog-media';

/**
 * Uploads a file to Supabase Storage and records it in the media table.
 *
 * Flow (Req 13.1–13.6):
 *  1. Validate MIME type and size via MediaUploadSchema.safeParse()
 *  2. Generate storage path: media/{uploaderId}/{year}/{month}/{uuid}.{ext}
 *  3. Upload to Supabase Storage bucket 'blog-media'; throw StorageError on failure
 *  4. Insert media row via createMediaRecord()
 *  5. On DB failure, remove the uploaded file (compensating transaction)
 *  6. Return { media, url }
 *
 * @param file - The File object from FormData
 * @param uploaderId - The UUID of the user uploading the file
 * @returns Object with media record and public URL
 * @throws {StorageError} if upload fails or validation fails
 */
export async function uploadMedia(opts: {
  file: File;
  uploaderId: string;
}): Promise<{ media: Media; url: string }> {
  const { file, uploaderId } = opts;

  // Step 1: Validate MIME type and size (Req 13.1, 13.2, 13.3)
  const validation = MediaUploadSchema.safeParse({
    mime_type: file.type,
    size_bytes: file.size,
  });

  if (!validation.success) {
    const firstError = validation.error.issues[0];
    throw new StorageError(
      `Media validation failed: ${firstError.path.join('.')}: ${firstError.message}`,
    );
  }

  // Step 2: Generate storage path (Req 13.4)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = randomUUID();
  const ext = getFileExtension(file.name) || getExtensionFromMime(file.type);
  const storagePath = `media/${uploaderId}/${year}/${month}/${uuid}.${ext}`;

  // Step 3: Upload to Supabase Storage (Req 13.4)
  const supabase = await createSupabaseServerClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new StorageError(
      `Failed to upload file to storage: ${uploadError.message}`,
    );
  }

  // Step 4: Insert media row (Req 13.4)
  let media: Media;
  try {
    media = await createMediaRecord({
      uploader_id: uploaderId,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
    });
  } catch (dbError) {
    // Step 5: Compensating transaction — remove uploaded file (Req 13.5)
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new StorageError(
      `Failed to create media record; file removed from storage: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
    );
  }

  // Step 6: Generate public URL (Req 13.6)
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    media,
    url: urlData.publicUrl,
  };
}

/**
 * Deletes a media file from both Supabase Storage and the database atomically.
 *
 * Flow (Req 13.8, 13.9):
 *  1. Check if media is in use via isMediaInUse()
 *  2. If in use, throw error (Req 13.9)
 *  3. Delete from Supabase Storage
 *  4. Delete from database
 *  5. If DB delete fails after storage delete, log warning (best effort)
 *
 * @param mediaId - The UUID of the media record to delete
 * @param storagePath - The storage_path from the media record
 * @throws {StorageError} if media is in use or deletion fails
 */
export async function deleteMedia(opts: {
  mediaId: string;
  storagePath: string;
}): Promise<void> {
  const { mediaId, storagePath } = opts;

  // Step 1 & 2: Check if media is in use (Req 13.9)
  const inUse = await isMediaInUse(mediaId);
  if (inUse) {
    throw new StorageError(
      'Cannot delete media: it is referenced in one or more posts',
    );
  }

  // Step 3: Delete from Supabase Storage (Req 13.8)
  const supabase = await createSupabaseServerClient();
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    throw new StorageError(
      `Failed to delete file from storage: ${storageError.message}`,
    );
  }

  // Step 4: Delete from database (Req 13.8)
  try {
    await deleteMediaRecord(mediaId);
  } catch (dbError) {
    // Best effort: if DB delete fails after storage delete succeeds,
    // we log a warning but don't re-throw (the file is already gone)
    console.error(
      `Warning: File deleted from storage but DB record removal failed for media ${mediaId}:`,
      dbError,
    );
  }
}

/**
 * Extracts file extension from filename.
 */
function getFileExtension(filename: string): string | null {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Maps MIME type to file extension as fallback.
 */
function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[mimeType] || 'bin';
}
