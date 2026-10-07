import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();
