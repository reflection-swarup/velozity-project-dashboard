import type { AccessRequestStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, forbidden, notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';
import { hashPassword } from '../auth/auth.service';
import { pushNotification, queueNotification } from '../notifications/notification.service';
import type { CreateAccessRequestInput } from './access-request.schemas';

const include = {
  preferredProject: { select: { id: true, name: true, manager: { select: { name: true } } } },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.AccessRequestInclude;

type RequestWithRelations = Prisma.AccessRequestGetPayload<{ include: typeof include }>;

// The password hash never leaves the service.
export const serializeRequest = (request: RequestWithRelations) => ({
  id: request.id,
  name: request.name,
  email: request.email,
  requestedRole: request.requestedRole,
  status: request.status,
  note: request.note,
  decisionReason: request.decisionReason,
  createdAt: request.createdAt.toISOString(),
  reviewedAt: request.reviewedAt?.toISOString() ?? null,
  preferredProject: request.preferredProject
    ? {
        id: request.preferredProject.id,
        name: request.preferredProject.name,
        managerName: request.preferredProject.manager.name,
      }
    : null,
  reviewedBy: request.reviewedBy,
});

// The public signup form needs something to choose from, and nothing more. Ids
// and display names only, never client details, emails or task counts.
export const publicOptions = async () => {
  const projects = await prisma.project.findMany({
    where: { status: { not: 'COMPLETED' } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return { projects };
};

export const create = async (input: CreateAccessRequestInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw conflict('An account with that email already exists');

  const existingRequest = await prisma.accessRequest.findFirst({
    where: { email: input.email, status: 'PENDING' },
  });
  if (existingRequest) throw conflict('A request for that email is already awaiting review');

  if (input.preferredProjectId) {
    const project = await prisma.project.count({ where: { id: input.preferredProjectId } });
    if (project === 0) throw notFound('Project not found');
  }

  const created = await prisma.accessRequest.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      requestedRole: input.requestedRole,
      preferredProjectId: input.preferredProjectId ?? null,
      note: input.note ?? null,
    },
    include,
  });

  // Onboarding is an organisation level decision, so only admins are notified.
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  const notifications = await prisma.$transaction((tx) =>
    Promise.all(
      admins.map((admin) =>
        queueNotification(tx, {
          userId: admin.id,
          type: 'ACCESS_REQUESTED',
          title: 'Access request awaiting review',
          body: `${created.name} asked to join as ${
            created.requestedRole === 'DEVELOPER' ? 'a developer' : 'a project manager'
          }`,
        }),
      ),
    ),
  );

  await Promise.all(notifications.map(pushNotification));

  return serializeRequest(created);
};

// Granting a role creates an account, which is an admin decision. Project
// managers decide project membership instead, on projects they own.
const assertReviewer = (user: AuthUser) => {
  if (user.role !== 'ADMIN') {
    throw forbidden('Only an admin can review access requests');
  }
};

export const list = async (user: AuthUser, status?: AccessRequestStatus) => {
  assertReviewer(user);

  const [requests, pendingCount] = await Promise.all([
    prisma.accessRequest.findMany({
      where: status ? { status } : {},
      include,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.accessRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return { items: requests.map(serializeRequest), pendingCount };
};

const findPending = async (id: string) => {
  const request = await prisma.accessRequest.findUnique({ where: { id }, include });
  if (!request) throw notFound('Access request not found');
  if (request.status !== 'PENDING') throw conflict('That request has already been reviewed');
  return request;
};

export const approve = async (user: AuthUser, id: string, overrides: { role?: Role }) => {
  assertReviewer(user);

  const request = await findPending(id);
  const grantedRole = overrides.role ?? request.requestedRole;

  const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
  if (existingUser) throw conflict('An account with that email already exists');

  // Approval creates the account and sets the role. It deliberately does not
  // put anybody on a project: that belongs to the manager who owns it.
  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.user.create({
      data: {
        name: request.name,
        email: request.email,
        passwordHash: request.passwordHash,
        role: grantedRole,
      },
    });

    await tx.accessRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED', reviewedById: user.id, reviewedAt: new Date() },
    });

    const notification = await queueNotification(tx, {
      userId: account.id,
      type: 'ACCESS_APPROVED',
      title: 'Welcome to Velozity',
      body:
        grantedRole === 'DEVELOPER'
          ? `${user.name} approved your access. A project manager will add you to a project.`
          : `${user.name} approved your access as a project manager. You can create projects now.`,
    });

    return { account, notification };
  });

  await pushNotification(result.notification);

  const updated = await prisma.accessRequest.findUniqueOrThrow({
    where: { id: request.id },
    include,
  });

  return {
    request: serializeRequest(updated),
    user: {
      id: result.account.id,
      name: result.account.name,
      email: result.account.email,
      role: result.account.role,
    },
  };
};

export const reject = async (user: AuthUser, id: string, reason?: string) => {
  assertReviewer(user);

  const request = await findPending(id);

  const updated = await prisma.accessRequest.update({
    where: { id: request.id },
    data: {
      status: 'REJECTED',
      reviewedById: user.id,
      reviewedAt: new Date(),
      decisionReason: reason ?? null,
    },
    include,
  });

  return serializeRequest(updated);
};

export type AccessRequestDto = ReturnType<typeof serializeRequest>;
