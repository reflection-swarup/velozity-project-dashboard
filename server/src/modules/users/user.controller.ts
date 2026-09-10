import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import * as service from './user.service';

export const list = async (req: Request, res: Response) => {
  const { role, search } = req.query as unknown as { role?: Role; search?: string };
  res.json({ items: await service.list({ role, search }) });
};

export const create = async (req: Request, res: Response) => {
  res.status(201).json({ user: await service.create(req.body) });
};

export const update = async (req: Request, res: Response) => {
  res.json({ user: await service.update(req.params.id as string, req.body) });
};
