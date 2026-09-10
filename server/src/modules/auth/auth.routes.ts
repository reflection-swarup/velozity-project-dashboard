import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './auth.controller';
import { loginSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(controller.login));
authRouter.post('/refresh', asyncHandler(controller.refresh));
authRouter.post('/logout', asyncHandler(controller.logout));
authRouter.get('/me', requireAuth, asyncHandler(controller.me));
