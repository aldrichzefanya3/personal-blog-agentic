import { z } from 'zod';

export const MediaUploadSchema = z.object({
  mime_type: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]),
  size_bytes: z.number().int().min(1).max(10_485_760),
});
