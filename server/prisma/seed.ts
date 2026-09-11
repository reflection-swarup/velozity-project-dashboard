import argon2 from 'argon2';
import { PrismaClient, type Prisma, type TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

const daysFromNow = (days: number, hour = 17) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

// Truncate rather than delete so the task number sequence restarts and a
// fresh seed always begins at Task #1.
const reset = () =>
  prisma.$executeRawUnsafe(
    'TRUNCATE TABLE activity_logs, notifications, tasks, project_members, projects, clients, refresh_tokens, users RESTART IDENTITY CASCADE',
  );

const main = async () => {
  await reset();

  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const admin = await prisma.user.create({
    data: { name: 'Aditi Rao', email: 'admin@velozity.test', role: 'ADMIN', passwordHash },
  });

  const [ravi, neha] = await Promise.all([
    prisma.user.create({
      data: { name: 'Ravi Menon', email: 'ravi@velozity.test', role: 'PROJECT_MANAGER', passwordHash },
    }),
    prisma.user.create({
      data: { name: 'Neha Sharma', email: 'neha@velozity.test', role: 'PROJECT_MANAGER', passwordHash },
    }),
  ]);

  const [karan, sana, dev, meera] = await Promise.all([
    prisma.user.create({
      data: { name: 'Karan Patel', email: 'karan@velozity.test', role: 'DEVELOPER', passwordHash },
    }),
    prisma.user.create({
      data: { name: 'Sana Qureshi', email: 'sana@velozity.test', role: 'DEVELOPER', passwordHash },
    }),
    prisma.user.create({
      data: { name: 'Dev Joshi', email: 'dev@velozity.test', role: 'DEVELOPER', passwordHash },
    }),
    prisma.user.create({
      data: { name: 'Meera Nair', email: 'meera@velozity.test', role: 'DEVELOPER', passwordHash },
    }),
  ]);

  const [northwind, lumen, kanto] = await Promise.all([
    prisma.client.create({
      data: { name: 'Northwind Retail', company: 'Northwind Pvt Ltd', contactEmail: 'ops@northwind.test' },
    }),
    prisma.client.create({
      data: { name: 'Lumen Health', company: 'Lumen Health Systems', contactEmail: 'it@lumen.test' },
    }),
    prisma.client.create({
      data: { name: 'Kanto Logistics', company: 'Kanto Logistics LLP', contactEmail: 'tech@kanto.test' },
    }),
  ]);

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Northwind Storefront Revamp',
        description: 'Rebuild the customer storefront with a new checkout flow and CMS integration.',
        clientId: northwind.id,
        managerId: ravi.id,
        status: 'ACTIVE',
        members: { create: [{ userId: karan.id }, { userId: sana.id }] },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Lumen Patient Portal',
        description: 'Patient onboarding portal with appointment booking and reminders.',
        clientId: lumen.id,
        managerId: ravi.id,
        status: 'ACTIVE',
        members: { create: [{ userId: sana.id }, { userId: dev.id }] },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Kanto Fleet Tracker',
        description: 'Live fleet tracking dashboard with driver assignment and route history.',
        clientId: kanto.id,
        managerId: neha.id,
        status: 'ACTIVE',
        members: { create: [{ userId: dev.id }, { userId: meera.id }] },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Northwind Loyalty Programme',
        description: 'Points engine and tier management for repeat customers.',
        clientId: northwind.id,
        managerId: neha.id,
        status: 'ON_HOLD',
        members: { create: [{ userId: meera.id }, { userId: karan.id }] },
      },
    }),
  ]);

  const [storefront, portal, fleet, loyalty] = projects;

  type SeedTask = {
    project: { id: string; name: string; managerId: string };
    title: string;
    description: string;
    status: TaskStatus;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dueDate: Date;
    assignee: { id: string; name: string };
    creator: { id: string; name: string };
    overdue?: boolean;
  };

  const seedTasks: SeedTask[] = [
    {
      project: storefront!,
      title: 'Set up checkout payment gateway',
      description: 'Integrate the payment provider sandbox and handle failed payment retries.',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: daysFromNow(2),
      assignee: karan,
      creator: ravi,
    },
    {
      project: storefront!,
      title: 'Product listing pagination',
      description: 'Replace infinite scroll with cursor based pagination on the listing page.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysFromNow(5),
      assignee: sana,
      creator: ravi,
    },
    {
      project: storefront!,
      title: 'Cart persistence across sessions',
      description: 'Persist guest carts for seven days and merge them on login.',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: daysFromNow(1),
      assignee: karan,
      creator: ravi,
    },
    {
      project: storefront!,
      title: 'Migrate banner content to CMS',
      description: 'Move hardcoded homepage banners into the CMS collection.',
      status: 'DONE',
      priority: 'LOW',
      dueDate: daysFromNow(-4),
      assignee: sana,
      creator: ravi,
    },
    {
      project: storefront!,
      title: 'Fix mobile filter drawer',
      description: 'Filter drawer does not close on Android Chrome after applying filters.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysFromNow(-2),
      assignee: sana,
      creator: ravi,
      overdue: true,
    },
    {
      project: storefront!,
      title: 'Lighthouse performance pass',
      description: 'Get the storefront above 90 on mobile performance.',
      status: 'TODO',
      priority: 'LOW',
      dueDate: daysFromNow(12),
      assignee: karan,
      creator: ravi,
    },
    {
      project: portal!,
      title: 'Appointment booking calendar',
      description: 'Weekly calendar view with slot availability pulled from the clinic API.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: daysFromNow(4),
      assignee: sana,
      creator: ravi,
    },
    {
      project: portal!,
      title: 'SMS reminder scheduler',
      description: 'Queue reminders twenty four hours before an appointment.',
      status: 'TODO',
      priority: 'CRITICAL',
      dueDate: daysFromNow(-1),
      assignee: dev,
      creator: ravi,
      overdue: true,
    },
    {
      project: portal!,
      title: 'Patient document upload',
      description: 'Allow PDF uploads with virus scanning before storage.',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      dueDate: daysFromNow(3),
      assignee: dev,
      creator: ravi,
    },
    {
      project: portal!,
      title: 'Consent form audit trail',
      description: 'Record who accepted which consent version and when.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysFromNow(9),
      assignee: sana,
      creator: ravi,
    },
    {
      project: portal!,
      title: 'Accessibility review of onboarding',
      description: 'Keyboard navigation and screen reader labels across the onboarding steps.',
      status: 'DONE',
      priority: 'LOW',
      dueDate: daysFromNow(-6),
      assignee: dev,
      creator: ravi,
    },
    {
      project: fleet!,
      title: 'Live vehicle map markers',
      description: 'Stream GPS pings onto the map and cluster markers at low zoom.',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: daysFromNow(3),
      assignee: meera,
      creator: neha,
    },
    {
      project: fleet!,
      title: 'Driver assignment workflow',
      description: 'Assign drivers to routes with conflict detection on overlapping shifts.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysFromNow(6),
      assignee: dev,
      creator: neha,
    },
    {
      project: fleet!,
      title: 'Route history export',
      description: 'CSV export of route history filtered by date range.',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      dueDate: daysFromNow(2),
      assignee: meera,
      creator: neha,
    },
    {
      project: fleet!,
      title: 'Geofence breach alerts',
      description: 'Alert dispatch when a vehicle leaves its assigned geofence.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysFromNow(8),
      assignee: dev,
      creator: neha,
    },
    {
      project: fleet!,
      title: 'Offline ping buffering',
      description: 'Buffer pings on the device while offline and replay them on reconnect.',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: daysFromNow(-9),
      assignee: meera,
      creator: neha,
    },
    {
      project: loyalty!,
      title: 'Points accrual rules engine',
      description: 'Configurable accrual rules per product category.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysFromNow(14),
      assignee: karan,
      creator: neha,
    },
    {
      project: loyalty!,
      title: 'Tier downgrade job',
      description: 'Nightly job that downgrades inactive members a tier.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysFromNow(16),
      assignee: meera,
      creator: neha,
    },
    {
      project: loyalty!,
      title: 'Reward catalogue admin screen',
      description: 'CRUD screen for rewards with image upload.',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      dueDate: daysFromNow(20),
      assignee: karan,
      creator: neha,
    },
    {
      project: loyalty!,
      title: 'Member statement email',
      description: 'Monthly points statement email with a summary of activity.',
      status: 'TODO',
      priority: 'LOW',
      dueDate: daysFromNow(24),
      assignee: meera,
      creator: neha,
    },
    {
      project: loyalty!,
      title: 'Fraud check on bulk redemptions',
      description: 'Flag accounts redeeming more than five rewards in a day.',
      status: 'TODO',
      priority: 'CRITICAL',
      dueDate: daysFromNow(11),
      assignee: karan,
      creator: neha,
    },
  ];

  const activityRows: Prisma.ActivityLogCreateManyInput[] = [];
  const notificationRows: Prisma.NotificationCreateManyInput[] = [];
  let clock = 60 * 26;

  for (const project of projects) {
    activityRows.push({
      type: 'PROJECT_CREATED',
      projectId: project!.id,
      actorId: project!.managerId,
      actorName: project!.managerId === ravi.id ? ravi.name : neha.name,
      message: `${project!.managerId === ravi.id ? ravi.name : neha.name} created project ${project!.name}`,
      createdAt: minutesAgo(clock),
    });
    clock -= 12;
  }

  for (const seed of seedTasks) {
    const overdue = seed.overdue === true;

    const task = await prisma.task.create({
      data: {
        projectId: seed.project.id,
        title: seed.title,
        description: seed.description,
        status: seed.status,
        priority: seed.priority,
        dueDate: seed.dueDate,
        assigneeId: seed.assignee.id,
        createdById: seed.creator.id,
        isOverdue: overdue,
        overdueAt: overdue ? minutesAgo(90) : null,
        completedAt: seed.status === 'DONE' ? minutesAgo(240) : null,
      },
    });

    activityRows.push({
      type: 'TASK_CREATED',
      projectId: seed.project.id,
      taskId: task.id,
      taskNumber: task.number,
      taskTitle: task.title,
      assigneeIdAtEvent: task.assigneeId,
      actorId: seed.creator.id,
      actorName: seed.creator.name,
      toStatus: 'TODO',
      message: `${seed.creator.name} created Task #${task.number} · ${task.title}`,
      createdAt: minutesAgo(clock),
    });
    clock -= 7;

    activityRows.push({
      type: 'TASK_ASSIGNED',
      projectId: seed.project.id,
      taskId: task.id,
      taskNumber: task.number,
      taskTitle: task.title,
      assigneeIdAtEvent: task.assigneeId,
      actorId: seed.creator.id,
      actorName: seed.creator.name,
      message: `${seed.creator.name} assigned Task #${task.number} to ${seed.assignee.name}`,
      createdAt: minutesAgo(clock),
    });
    clock -= 5;

    notificationRows.push({
      userId: seed.assignee.id,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      body: `${seed.creator.name} assigned you Task #${task.number} · ${task.title}`,
      taskId: task.id,
      projectId: seed.project.id,
      createdAt: minutesAgo(clock),
      readAt: seed.status === 'DONE' ? minutesAgo(clock - 2) : null,
    });

    const journey: TaskStatus[] = ['IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    const target = journey.indexOf(seed.status);
    let from: TaskStatus = 'TODO';

    for (let step = 0; step <= target; step += 1) {
      const to = journey[step]!;
      activityRows.push({
        type: 'TASK_STATUS_CHANGED',
        projectId: seed.project.id,
        taskId: task.id,
        taskNumber: task.number,
        taskTitle: task.title,
        assigneeIdAtEvent: task.assigneeId,
        actorId: seed.assignee.id,
        actorName: seed.assignee.name,
        fromStatus: from,
        toStatus: to,
        message: `${seed.assignee.name} moved Task #${task.number} from ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`,
        createdAt: minutesAgo(clock),
      });
      clock -= 4;

      if (to === 'IN_REVIEW') {
        notificationRows.push({
          userId: seed.project.managerId,
          type: 'TASK_IN_REVIEW',
          title: 'Task ready for review',
          body: `${seed.assignee.name} moved Task #${task.number} · ${task.title} to In Review`,
          taskId: task.id,
          projectId: seed.project.id,
          createdAt: minutesAgo(clock),
        });
      }

      from = to;
    }

    if (overdue) {
      activityRows.push({
        type: 'TASK_OVERDUE',
        projectId: seed.project.id,
        taskId: task.id,
        taskNumber: task.number,
        taskTitle: task.title,
        assigneeIdAtEvent: task.assigneeId,
        actorId: null,
        actorName: 'System',
        toStatus: task.status,
        message: `Task #${task.number} · ${task.title} is overdue`,
        createdAt: minutesAgo(88),
      });

      notificationRows.push({
        userId: seed.assignee.id,
        type: 'TASK_OVERDUE',
        title: 'Task overdue',
        body: `Task #${task.number} · ${task.title} passed its due date`,
        taskId: task.id,
        projectId: seed.project.id,
        createdAt: minutesAgo(88),
      });
    }
  }

  await prisma.accessRequest.createMany({
    data: [
      {
        name: 'Ishaan Verma',
        email: 'ishaan@velozity.test',
        passwordHash,
        requestedRole: 'DEVELOPER',
        preferredProjectId: storefront!.id,
        note: 'Hoping to work on the storefront checkout this sprint.',
        createdAt: minutesAgo(140),
      },
      {
        name: 'Priya Nair',
        email: 'priya@velozity.test',
        passwordHash,
        requestedRole: 'PROJECT_MANAGER',
        note: 'Taking over delivery for the new retail account.',
        createdAt: minutesAgo(65),
      },
    ],
  });

  // Onboarding is an admin decision, so only admins are notified about it.
  const pending = await prisma.accessRequest.findMany({ where: { status: 'PENDING' } });
  for (const request of pending) {
    notificationRows.push({
      userId: admin.id,
      type: 'ACCESS_REQUESTED',
      title: 'Access request awaiting review',
      body: `${request.name} asked to join as ${
        request.requestedRole === 'DEVELOPER' ? 'a developer' : 'a project manager'
      }`,
      createdAt: request.createdAt,
    });
  }

  await prisma.activityLog.createMany({ data: activityRows });
  await prisma.notification.createMany({ data: notificationRows });

  const counts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    overdueTasks: await prisma.task.count({ where: { isOverdue: true } }),
    activity: await prisma.activityLog.count(),
    accessRequests: await prisma.accessRequest.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('seed complete', counts);
  console.log(`login with any seeded email and the password ${DEMO_PASSWORD}`);
  console.log(`admin: ${admin.email} | managers: ${ravi.email}, ${neha.email}`);
  console.log(`developers: ${karan.email}, ${sana.email}, ${dev.email}, ${meera.email}`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
