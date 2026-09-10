import type { Notification } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { broadcastActivity, recordActivity } from '../modules/activity/activity.service';
import { pushNotification, queueNotification } from '../modules/notifications/notification.service';

const BATCH_SIZE = 200;

// The isOverdue filter makes this sweep idempotent, so an overlapping or
// repeated run never double-logs the same task.
export const flagOverdueTasks = async () => {
  const now = new Date();

  const due = await prisma.task.findMany({
    where: {
      isOverdue: false,
      status: { not: 'DONE' },
      dueDate: { lt: now },
    },
    include: { project: { select: { id: true, name: true, managerId: true } } },
    take: BATCH_SIZE,
  });

  if (due.length === 0) return { flagged: 0 };

  const results = await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { id: { in: due.map((task) => task.id) } },
      data: { isOverdue: true, overdueAt: now },
    });

    const events = [];
    const notifications: Notification[] = [];

    for (const task of due) {
      const activity = await recordActivity(tx, {
        type: 'TASK_OVERDUE',
        projectId: task.projectId,
        projectName: task.project.name,
        managerId: task.project.managerId,
        taskId: task.id,
        taskNumber: task.number,
        taskTitle: task.title,
        assigneeIdAtEvent: task.assigneeId,
        actorId: null,
        actorName: 'System',
        toStatus: task.status,
        message: `Task #${task.number} · ${task.title} is overdue`,
      });

      events.push({
        activity,
        audience: {
          projectId: task.projectId,
          managerId: task.project.managerId,
          assigneeId: task.assigneeId,
        },
      });

      if (task.assigneeId) {
        notifications.push(
          await queueNotification(tx, {
            userId: task.assigneeId,
            type: 'TASK_OVERDUE',
            title: 'Task overdue',
            body: `Task #${task.number} · ${task.title} passed its due date`,
            taskId: task.id,
            projectId: task.projectId,
          }),
        );
      }
    }

    return { events, notifications };
  });

  for (const event of results.events) broadcastActivity(event.activity, event.audience);
  await Promise.all(results.notifications.map(pushNotification));

  logger.info({ flagged: due.length }, 'overdue sweep flagged tasks');
  return { flagged: due.length };
};
