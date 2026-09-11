import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { publicReadLimiter, signupLimiter } from '../../middleware/rateLimit';
import * as controller from './access-request.controller';
import {
  approveSchema,
  createAccessRequestSchema,
  idParamSchema,
  listAccessRequestsQuerySchema,
  rejectSchema,
} from './access-request.schemas';

export const accessRequestRouter = Router();

// The two public endpoints. Both are rate limited, and the signup form can
// only ever create a pending request, never an account.
accessRequestRouter.get('/options', publicReadLimiter, asyncHandler(controller.options));

accessRequestRouter.post(
  '/',
  signupLimiter,
  validate({ body: createAccessRequestSchema }),
  asyncHandler(controller.create),
);

accessRequestRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ query: listAccessRequestsQuerySchema }),
  asyncHandler(controller.list),
);

accessRequestRouter.post(
  '/:id/approve',
  requireAuth,
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: idParamSchema, body: approveSchema }),
  asyncHandler(controller.approve),
);

accessRequestRouter.post(
  '/:id/reject',
  requireAuth,
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: idParamSchema, body: rejectSchema }),
  asyncHandler(controller.reject),
);
