import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const PostSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(255);

export const CreatePostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1),
  excerpt: z.string().max(500).optional(),
  cover_image_url: z.url().max(2048).optional(),
  category_ids: z.array(z.string().uuid()),
  tag_ids: z.array(z.string().uuid()),
});

export const UpdatePostSchema = CreatePostSchema.partial().extend({
  slug: PostSlugSchema.optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});
