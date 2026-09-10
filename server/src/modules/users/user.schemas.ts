import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']);

export const listUsersQuerySchema = z.object({
  role: roleEnum.optional(),
  search: z.string().trim().min(1).max(80).optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  role: roleEnum,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: roleEnum.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const idParamSchema = z.object({ id: z.string().uuid() });
