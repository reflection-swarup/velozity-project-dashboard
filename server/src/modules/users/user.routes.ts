import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './user.controller';
import {
  createUserSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from './user.schemas';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get(
  '/',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(controller.list),
);

userRouter.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createUserSchema }),
  asyncHandler(controller.create),
);

userRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(controller.update),
);
