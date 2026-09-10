import { z } from 'zod';

export const projectStatusEnum = z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED']);

export const listProjectsQuerySchema = z.object({
  status: projectStatusEnum.optional(),
  clientId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(80).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(''),
  clientId: z.string().uuid(),
  managerId: z.string().uuid().optional(),
  status: projectStatusEnum.default('ACTIVE'),
  memberIds: z.array(z.string().uuid()).max(50).default([]),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    clientId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    status: projectStatusEnum.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const memberSchema = z.object({ userId: z.string().uuid() });

export const idParamSchema = z.object({ id: z.string().uuid() });

export const memberParamSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() });
