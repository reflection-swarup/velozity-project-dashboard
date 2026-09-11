import { z } from 'zod';

// Admin is deliberately absent: an admin can only be created by another admin
// from the team page, never requested through the public form.
export const requestableRoleEnum = z.enum(['PROJECT_MANAGER', 'DEVELOPER']);

export const createAccessRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
    requestedRole: requestableRoleEnum,
    projectId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.requestedRole !== 'DEVELOPER' || Boolean(value.projectId), {
    path: ['projectId'],
    message: 'Choose the project you are joining',
  });

export const listAccessRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const approveSchema = z.object({
  role: requestableRoleEnum.optional(),
  projectId: z.string().uuid().optional(),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(300).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
