import type { Request, Response } from 'express';
import type { ProjectStatus } from '@prisma/client';
import { currentUser } from '../../middleware/auth';
import * as service from './project.service';

export const list = async (req: Request, res: Response) => {
  const filters = req.query as unknown as {
    status?: ProjectStatus;
    clientId?: string;
    managerId?: string;
    search?: string;
  };
  res.json({ items: await service.list(currentUser(req), filters) });
};

export const getById = async (req: Request, res: Response) => {
  res.json({ project: await service.getById(currentUser(req), req.params.id as string) });
};

export const create = async (req: Request, res: Response) => {
  res.status(201).json({ project: await service.create(currentUser(req), req.body) });
};

export const update = async (req: Request, res: Response) => {
  res.json({
    project: await service.update(currentUser(req), req.params.id as string, req.body),
  });
};

export const remove = async (req: Request, res: Response) => {
  await service.remove(currentUser(req), req.params.id as string);
  res.status(204).send();
};

export const addMember = async (req: Request, res: Response) => {
  const member = await service.addMember(
    currentUser(req),
    req.params.id as string,
    req.body.userId as string,
  );
  res.status(201).json({ member });
};

export const removeMember = async (req: Request, res: Response) => {
  await service.removeMember(
    currentUser(req),
    req.params.id as string,
    req.params.userId as string,
  );
  res.status(204).send();
};
