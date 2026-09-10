import { z } from 'zod';

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
