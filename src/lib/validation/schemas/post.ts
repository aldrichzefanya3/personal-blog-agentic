import { z } from 'zod';

/**
 * UUID schema.
 *
 * Uses a Postgres-compatible UUID regex rather than Zod's `.uuid()` because
 * Zod v4's `.uuid()` ONLY accepts version-4 UUIDs, while Postgres's `uuid`
 * type accepts any 8-4-4-4-12 hex string regardless of version.  Seed data
 * and any legacy rows may carry non-v4 UUIDs (e.g. `10000000-...`), so the
 * validator must match the DB's actual acceptance criteria.
 *
 * Requirements: 11.9, 14.1, 14.4
 */
export const UUIDSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID',
  )
  .max(36, 'UUID must be 36 characters or fewer');

export const PostSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(255);

export const CreatePostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1),
  excerpt: z.string().max(500).optional(),
  cover_image_url: z.url().max(2048).optional(),
  category_ids: z.array(UUIDSchema),
  tag_ids: z.array(UUIDSchema),
});

export const UpdatePostSchema = CreatePostSchema.partial().extend({
  slug: PostSlugSchema.optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});