import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email(),
});

export const updateClientSchema = createClientSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Provide at least one field to update' },
);

export const idParamSchema = z.object({ id: z.string().uuid() });
