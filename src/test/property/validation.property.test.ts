/**
 * Property-based tests CP-4 and CP-5: Zod Validator — Invalid Input Rejection
 * and Valid Input Round-Trip.
 *
 * CP-4: For any whitespace-only title, CreatePostSchema.safeParse() MUST fail
 *       with a `title` field issue.
 *
 * CP-4: For any size_bytes > 10_485_760, MediaUploadSchema.safeParse() MUST fail.
 *
 * CP-5: For any input that passes CreatePostSchema.safeParse(), the parsed
 *       value MUST survive a JSON round-trip and remain deeply equal.
 *
 * **Validates: Requirements 11.9, 11.11, 13.1, 13.2, 14.1, 14.2, 14.4**
 * Requirements: 18.6
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { CreatePostSchema } from '@/lib/validation/schemas/post';
import { MediaUploadSchema } from '@/lib/validation/schemas/media';

describe('CP-4: Zod Validator — Invalid Input Rejection', () => {
  /**
   * **Validates: Requirements 11.9, 11.11, 14.1, 14.2**
   *
   * Property 4a: Whitespace-only titles are rejected with a `title` field issue.
   */
  it('CreatePostSchema rejects whitespace-only titles with a title issue', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (title) => {
        const result = CreatePostSchema.safeParse({
          title,
          content: 'valid content',
          category_ids: [],
          tag_ids: [],
        });

        if (result.success) return false;

        const hasTitleIssue = result.error.issues.some(
          (issue) => issue.path[0] === 'title',
        );
        return hasTitleIssue;
      }),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2**
   *
   * Property 4b: MediaUploadSchema rejects any size_bytes above the 10 MB limit.
   */
  it('MediaUploadSchema rejects size_bytes above the 10 MB limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10_485_761, max: 100_000_000 }),
        fc.constantFrom(
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'image/avif',
        ),
        (sizeBytes, mimeType) => {
          const result = MediaUploadSchema.safeParse({
            mime_type: mimeType,
            size_bytes: sizeBytes,
          });
          return !result.success;
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe('CP-5: Zod Validator — Valid Input Round-Trip', () => {
  /**
   * **Validates: Requirements 14.1, 14.4**
   *
   * Property 5: Any input that passes CreatePostSchema.safeParse() must survive
   * a JSON round-trip (serialize → parse) and remain deeply equal.
   */
  it('CreatePostSchema parsed values survive JSON round-trip', () => {
    const validTitleArbitrary = fc
      .string({ minLength: 1, maxLength: 255 })
      .filter((s) => s.trim().length > 0);
    const validContentArbitrary = fc
      .string({ minLength: 1, maxLength: 5000 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(
        validTitleArbitrary,
        validContentArbitrary,
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(fc.uuid(), { maxLength: 5 }),
        fc.array(fc.uuid(), { maxLength: 5 }),
        (title, content, excerpt, categoryIds, tagIds) => {
          const input = {
            title,
            content,
            excerpt: excerpt.length > 0 ? excerpt : undefined,
            category_ids: categoryIds,
            tag_ids: tagIds,
          };

          const result = CreatePostSchema.safeParse(input);
          if (!result.success) return false;

          // JSON round-trip: serialize the parsed value, then parse it back.
          // The re-parsed object must produce identical JSON serialization,
          // proving the parsed data is plain JSON-serializable.
          const serialized = JSON.parse(JSON.stringify(result.data));
          return JSON.stringify(serialized) === JSON.stringify(result.data);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('CP-10: Media Upload Validation — Boundary Invariant', () => {
  const validMimeArbitrary = fc.constantFrom(
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  );

  /**
   * **Validates: Requirements 13.1, 13.2, 13.3**
   *
   * Property 10a: MediaUploadSchema.safeParse() fails for any size_bytes above
   * the 10 MB limit, regardless of MIME type.
   */
  it('rejects any size_bytes above the 10 MB limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10_485_761, max: 100_000_000 }),
        validMimeArbitrary,
        (sizeBytes, mimeType) => {
          const result = MediaUploadSchema.safeParse({
            mime_type: mimeType,
            size_bytes: sizeBytes,
          });
          return !result.success;
        },
      ),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2, 13.3**
   *
   * Property 10b: MediaUploadSchema.safeParse() fails for any disallowed MIME
   * type, regardless of size.
   */
  it('rejects any disallowed MIME type', () => {
    const disallowedMimeArbitrary = fc.string().filter(
      (s) =>
        ![
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'image/avif',
        ].includes(s) && s.length > 0,
    );

    fc.assert(
      fc.property(
        disallowedMimeArbitrary,
        fc.integer({ min: 1, max: 10_485_760 }),
        (mimeType, sizeBytes) => {
          const result = MediaUploadSchema.safeParse({
            mime_type: mimeType,
            size_bytes: sizeBytes,
          });
          return !result.success;
        },
      ),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2, 13.3**
   *
   * Property 10c: MediaUploadSchema.safeParse() passes for all valid
   * combinations of allowed MIME types and in-range sizes.
   */
  it('accepts all valid combinations of MIME and size', () => {
    fc.assert(
      fc.property(
        validMimeArbitrary,
        fc.integer({ min: 1, max: 10_485_760 }),
        (mimeType, sizeBytes) => {
          const result = MediaUploadSchema.safeParse({
            mime_type: mimeType,
            size_bytes: sizeBytes,
          });
          return result.success;
        },
      ),
      { numRuns: 1000 },
    );
  });
});