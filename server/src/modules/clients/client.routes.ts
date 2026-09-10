import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './client.controller';
import { createClientSchema, idParamSchema, updateClientSchema } from './client.schemas';

export const clientRouter = Router();

clientRouter.use(requireAuth);

clientRouter.get('/', requireRole('ADMIN', 'PROJECT_MANAGER'), asyncHandler(controller.list));

clientRouter.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createClientSchema }),
  asyncHandler(controller.create),
);

clientRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateClientSchema }),
  asyncHandler(controller.update),
);

clientRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
