/**
 * Cache revalidation utilities with error handling.
 *
 * Requirement 5.7: On revalidation failure, log the error and continue
 * serving cached content rather than returning an error response to visitors.
 */

import { revalidateTag as nextRevalidateTag } from 'next/cache';

/**
 * Safely revalidate a cache tag with error handling.
 *
 * If revalidation fails, logs the error and continues serving cached content.
 * This prevents revalidation errors from breaking the user experience.
 *
 * @param tag - The cache tag to revalidate
 * @returns void
 */
export function safeRevalidateTag(tag: string): void {
  try {
    // Next.js 16+ requires a second argument for revalidateTag
    // 'max' means revalidate as soon as possible
    nextRevalidateTag(tag, 'max');
  } catch (error) {
    // Log the error but continue execution (Req 5.7)
    console.error(`[Cache Revalidation] Failed to revalidate tag "${tag}":`, error);
    // The previously cached version will continue to be served
  }
}

/**
 * Safely revalidate multiple cache tags with error handling.
 *
 * If revalidation fails for any tag, logs the error and continues with remaining tags.
 * This prevents revalidation errors from breaking the user experience.
 *
 * @param tags - Array of cache tags to revalidate
 * @returns void
 */
export function safeRevalidateTags(tags: string[]): void {
  for (const tag of tags) {
    safeRevalidateTag(tag);
  }
}
