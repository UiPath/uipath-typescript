import { z } from 'zod';

export const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  secret: z.string().min(1)
});

export type Config = z.infer<typeof ConfigSchema>;
