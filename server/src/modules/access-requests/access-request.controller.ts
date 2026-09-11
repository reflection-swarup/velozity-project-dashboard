import type { Request, Response } from 'express';
import type { AccessRequestStatus, Role } from '@prisma/client';
import { currentUser } from '../../middleware/auth';
import * as service from './access-request.service';

export const options = async (_req: Request, res: Response) => {
  res.json(await service.publicOptions());
};

export const create = async (req: Request, res: Response) => {
  res.status(201).json({ request: await service.create(req.body) });
};

export const list = async (req: Request, res: Response) => {
  const { status } = req.query as unknown as { status?: AccessRequestStatus };
  res.json(await service.list(currentUser(req), status));
};

export const approve = async (req: Request, res: Response) => {
  const body = req.body as { role?: Role };
  res.json(await service.approve(currentUser(req), req.params.id as string, body));
};

export const reject = async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  res.json({ request: await service.reject(currentUser(req), req.params.id as string, reason) });
};
