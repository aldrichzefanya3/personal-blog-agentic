'use server';

/**
 * Media Server Actions — Requirements 13.6, 13.7, 13.8, 13.9, 13.10
 *
 * Req 13.6 — Return URL for uploaded media
 * Req 13.7 — List media items with pagination
 * Req 13.8 — Atomic delete (storage + DB)
 * Req 13.9 — Prevent deletion if media is in use
 * Req 13.10 — Require authentication for all operations
 */

import { revalidatePath } from 'next/cache';
import { requireRole, requireOwnership } from '@/lib/authz/guards';
import { uploadMedia, deleteMedia } from '@/lib/services/media';
import { getMediaByUploader, getMediaById } from '@/lib/db/queries/media';
import { StorageError } from '@/lib/errors';

/**
 * Uploads a media file (Req 13.1–13.6, 13.10)
 *
 * Flow:
 *  1. Verify user has 'media:upload' permission (Req 13.10)
 *  2. Extract file from FormData
 *  3. Call uploadMedia() service function
 *  4. Return media record with URL (Req 13.6)
 *  5. Revalidate media library page
 *
 * @param formData - Form data containing the file under key 'file'
 * @returns Error object or { success: true, media, url }
 */
export async function uploadMediaAction(formData: FormData) {
  try {
    // Step 1: Verify permission (Req 13.10)
    const session = await requireRole('media:upload');

    // Step 2: Extract file
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return { error: 'No file provided' };
    }

    // Step 3: Upload media (handles validation, storage, DB record)
    const result = await uploadMedia({
      file,
      uploaderId: session.id,
    });

    // Step 5: Revalidate media library
    revalidatePath('/admin/media');

    // Step 4: Return success with media and URL (Req 13.6)
    return {
      success: true,
      media: result.media,
      url: result.url,
    };
  } catch (error) {
    console.error('uploadMediaAction error:', error);

    if (error instanceof StorageError) {
      return { error: error.message };
    }

    return {
      error: 'Failed to upload media. Please try again.',
    };
  }
}

/**
 * Lists media files uploaded by the current user (Req 13.7, 13.10)
 *
 * Flow:
 *  1. Verify user has 'media:upload' permission (any authenticated user)
 *  2. Parse pagination parameters from URL search params
 *  3. Fetch media records for current user
 *  4. Attach public URLs to each media item (Req 13.6)
 *
 * @param page - Page number (default: 1)
 * @param pageSize - Items per page (default: 100, max: 100)
 * @returns PaginatedResult with media items including URLs
 */
export async function listMediaAction(opts?: { page?: number; pageSize?: number }) {
  try {
    // Step 1: Verify permission (Req 13.10)
    const session = await requireRole('media:upload');

    // Step 2: Parse pagination
    const page = opts?.page ?? 1;
    const pageSize = Math.min(opts?.pageSize ?? 100, 100);

    // Step 3: Fetch media records (Req 13.7)
    const result = await getMediaByUploader({
      uploaderId: session.id,
      page,
      pageSize,
    });

    // Step 4: Attach URLs (Req 13.6)
    // Note: URLs can be generated client-side from storage_path or via a helper
    // For now, we'll include storage_path and let the client component generate URLs

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error('listMediaAction error:', error);
    return {
      error: 'Failed to load media library. Please try again.',
    };
  }
}

/**
 * Deletes a media file (Req 13.8, 13.9, 13.10)
 *
 * Flow:
 *  1. Verify user has 'media:delete:any' permission OR owns the media
 *  2. Fetch media record to get storage_path
 *  3. Call deleteMedia() service function
 *      - Checks if media is in use (Req 13.9)
 *      - Deletes from storage and DB atomically (Req 13.8)
 *  4. Revalidate media library page
 *
 * @param formData - Form data containing media 'id'
 * @returns Error object or { success: true }
 */
export async function deleteMediaAction(formData: FormData) {
  try {
    // Extract media ID
    const mediaId = formData.get('id')?.toString();
    if (!mediaId) {
      return { error: 'Media ID is required' };
    }

    // Step 2: Fetch media record to check ownership and get storage_path
    const media = await getMediaById(mediaId);
    if (!media) {
      return { error: 'Media not found' };
    }

    // Step 1: Verify permission (Req 13.10)
    // ADMIN can delete any media; others can only delete their own
    await requireOwnership(media.uploader_id, 'media:delete:any');

    // Step 3: Delete media (handles in-use check, storage, and DB)
    await deleteMedia({
      mediaId: media.id,
      storagePath: media.storage_path,
    });

    // Step 4: Revalidate media library
    revalidatePath('/admin/media');

    return { success: true };
  } catch (error) {
    console.error('deleteMediaAction error:', error);

    if (error instanceof StorageError) {
      return { error: error.message };
    }

    return {
      error: 'Failed to delete media. Please try again.',
    };
  }
}
