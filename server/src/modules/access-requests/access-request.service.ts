import type { AccessRequest, AccessRequestStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';
import { broadcastActivity, recordActivity } from '../activity/activity.service';
import { hashPassword } from '../auth/auth.service';
import { pushNotification, queueNotification } from '../notifications/notification.service';
import type { CreateAccessRequestInput } from './access-request.schemas';

const include = {
  project: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true, email: true } },
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
  project: request.project,
  manager: request.manager,
  reviewedBy: request.reviewedBy,
});

// The public signup form needs names to choose from, and nothing else. Only ids
// and display names are exposed, never client details or task counts.
export const publicOptions = async () => {
  const [managers, projects] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'PROJECT_MANAGER', isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      where: { status: { not: 'COMPLETED' } },
      select: { id: true, name: true, managerId: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return { managers, projects };
};

export const create = async (input: CreateAccessRequestInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw conflict('An account with that email already exists');

  const existingRequest = await prisma.accessRequest.findFirst({
    where: { email: input.email, status: 'PENDING' },
  });
  if (existingRequest) throw conflict('A request for that email is already awaiting review');

  const project = input.projectId
    ? await prisma.project.findUnique({ where: { id: input.projectId } })
    : null;
  if (input.projectId && !project) throw notFound('Project not found');

  // A developer joins under the project's own manager, so the request always
  // reaches somebody who can actually approve it.
  const managerId = project?.managerId ?? input.managerId ?? null;

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) throw notFound('Manager not found');
    if (manager.role === 'DEVELOPER') throw badRequest('That person does not manage projects');
  }

  const created = await prisma.accessRequest.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      requestedRole: input.requestedRole,
      projectId: input.projectId ?? null,
      managerId,
      note: input.note ?? null,
    },
    include,
  });

  // Everyone who could act on it hears about it: the admins, plus the named
  // manager when the request points at one.
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  const recipientIds = new Set(admins.map((admin) => admin.id));
  if (managerId && created.requestedRole === 'DEVELOPER') recipientIds.add(managerId);

  const notifications = await prisma.$transaction((tx) =>
    Promise.all(
      [...recipientIds].map((userId) =>
        queueNotification(tx, {
          userId,
          type: 'ACCESS_REQUESTED',
          title: 'Access request awaiting review',
          body: `${created.name} asked to join as ${
            created.requestedRole === 'DEVELOPER' ? 'a developer' : 'a project manager'
          }${created.project ? ` on ${created.project.name}` : ''}`,
          projectId: created.projectId,
        }),
      ),
    ),
  );

  await Promise.all(notifications.map(pushNotification));

  return serializeRequest(created);
};

// Admins review everything. A manager may only review developer requests
// pointing at a project they own, and can never grant a manager role.
const assertReviewable = (user: AuthUser, request: RequestWithRelations & { project: { id: string } | null }) => {
  if (user.role === 'ADMIN') return;

  if (user.role !== 'PROJECT_MANAGER') {
    throw forbidden('Only an admin or a project manager can review access requests');
  }

  if (request.requestedRole !== 'DEVELOPER') {
    throw forbidden('Only an admin can approve a project manager');
  }

  if (request.managerId !== user.id) {
    throw forbidden('This request is addressed to another manager');
  }
};

const reviewScope = (user: AuthUser): Prisma.AccessRequestWhereInput => {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PROJECT_MANAGER') {
    return { requestedRole: 'DEVELOPER', managerId: user.id };
  }
  return { id: '__none__' };
};

export const list = async (user: AuthUser, status?: AccessRequestStatus) => {
  if (user.role === 'DEVELOPER') throw forbidden('Developers cannot review access requests');

  const requests = await prisma.accessRequest.findMany({
    where: { AND: [reviewScope(user), status ? { status } : {}] },
    include,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const pendingCount = await prisma.accessRequest.count({
    where: { AND: [reviewScope(user), { status: 'PENDING' }] },
  });

  return { items: requests.map(serializeRequest), pendingCount };
};

export const pendingCount = async (user: AuthUser) => {
  if (user.role === 'DEVELOPER') return 0;
  return prisma.accessRequest.count({
    where: { AND: [reviewScope(user), { status: 'PENDING' }] },
  });
};

const findPending = async (id: string) => {
  const request = await prisma.accessRequest.findUnique({ where: { id }, include });
  if (!request) throw notFound('Access request not found');
  if (request.status !== 'PENDING') throw conflict('That request has already been reviewed');
  return request;
};

export const approve = async (
  user: AuthUser,
  id: string,
  overrides: { role?: Role; projectId?: string },
) => {
  const request = await findPending(id);
  assertReviewable(user, request);

  // Only an admin may grant a role other than the one requested, and never a
  // role above what the reviewer could grant themselves.
  const grantedRole = overrides.role ?? request.requestedRole;
  if (grantedRole !== request.requestedRole && user.role !== 'ADMIN') {
    throw forbidden('Only an admin can change the role being granted');
  }
  if (user.role === 'PROJECT_MANAGER' && grantedRole !== 'DEVELOPER') {
    throw forbidden('A project manager can only grant the developer role');
  }

  const projectId = overrides.projectId ?? request.projectId ?? null;
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw notFound('Project not found');
    if (user.role === 'PROJECT_MANAGER' && project.managerId !== user.id) {
      throw forbidden('You can only add people to the projects you manage');
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
  if (existingUser) throw conflict('An account with that email already exists');

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

    let activity = null;
    if (projectId) {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: account.id } },
        create: { projectId, userId: account.id },
        update: {},
      });

      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId } });
      activity = await recordActivity(tx, {
        type: 'MEMBER_JOINED',
        projectId,
        projectName: project.name,
        managerId: project.managerId,
        actorId: user.id,
        actorName: user.name,
        message: `${user.name} approved ${account.name} to join ${project.name}`,
      });
    }

    const notification = await queueNotification(tx, {
      userId: account.id,
      type: 'ACCESS_APPROVED',
      title: 'Welcome to Velozity',
      body: `${user.name} approved your access as ${
        grantedRole === 'DEVELOPER' ? 'a developer' : 'a project manager'
      }. Sign in with the password you chose.`,
      projectId,
    });

    return { account, activity, notification, projectId };
  });

  if (result.activity && result.projectId) {
    const project = await prisma.project.findUnique({ where: { id: result.projectId } });
    if (project) {
      broadcastActivity(result.activity, {
        projectId: project.id,
        managerId: project.managerId,
      });
    }
  }

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
  const request = await findPending(id);
  assertReviewable(user, request);

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
export type { AccessRequest };
