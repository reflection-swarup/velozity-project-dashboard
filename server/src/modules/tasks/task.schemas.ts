import { z } from 'zod';

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const csvEnum = <T extends [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)).min(1));

export const listTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: csvEnum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: csvEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  overdue: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['priority', 'dueDate', 'createdAt', 'status']).default('priority'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).default(''),
  status: taskStatusEnum.default('TODO'),
  priority: taskPriorityEnum.default('MEDIUM'),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const updateStatusSchema = z.object({ status: taskStatusEnum });

export const idParamSchema = z.object({ id: z.string().uuid() });

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
