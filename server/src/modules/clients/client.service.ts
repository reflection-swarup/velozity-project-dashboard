import { prisma } from '../../lib/prisma';
import { conflict, notFound } from '../../lib/errors';

export const list = () =>
  prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { projects: true } } },
  });

export const create = (input: { name: string; company: string; contactEmail: string }) =>
  prisma.client.create({ data: input });

export const update = async (
  id: string,
  input: { name?: string; company?: string; contactEmail?: string },
) => {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw notFound('Client not found');
  return prisma.client.update({ where: { id }, data: input });
};

export const remove = async (id: string) => {
  const projects = await prisma.project.count({ where: { clientId: id } });
  if (projects > 0) throw conflict('Cannot delete a client that still has projects');
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw notFound('Client not found');
  await prisma.client.delete({ where: { id } });
};
