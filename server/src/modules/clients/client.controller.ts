import type { Request, Response } from 'express';
import * as service from './client.service';

export const list = async (_req: Request, res: Response) => {
  res.json({ items: await service.list() });
};

export const create = async (req: Request, res: Response) => {
  res.status(201).json({ client: await service.create(req.body) });
};

export const update = async (req: Request, res: Response) => {
  res.json({ client: await service.update(req.params.id as string, req.body) });
};

export const remove = async (req: Request, res: Response) => {
  await service.remove(req.params.id as string);
  res.status(204).send();
};
