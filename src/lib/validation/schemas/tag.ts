import { z } from 'zod';

export const CreateTagSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const UpdateTagSchema = CreateTagSchema.partial();
