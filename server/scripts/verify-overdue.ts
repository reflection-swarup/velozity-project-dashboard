import { prisma } from '../src/lib/prisma';
import { flagOverdueTasks } from '../src/jobs/overdue.job';

const main = async () => {
  const project = await prisma.project.findFirstOrThrow();
  const creator = await prisma.user.findFirstOrThrow({ where: { role: 'PROJECT_MANAGER' } });
  const assignee = await prisma.user.findFirstOrThrow({ where: { role: 'DEVELOPER' } });

  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      title: 'Scheduler verification task',
      description: 'created by scripts/verify-overdue.ts',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
      assigneeId: assignee.id,
      createdById: creator.id,
      isOverdue: false,
    },
  });

  const first = await flagOverdueTasks();
  const afterFirst = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  const logs = await prisma.activityLog.count({ where: { taskId: task.id, type: 'TASK_OVERDUE' } });
  const notifications = await prisma.notification.count({
    where: { taskId: task.id, type: 'TASK_OVERDUE' },
  });

  const second = await flagOverdueTasks();
  const logsAfterSecond = await prisma.activityLog.count({
    where: { taskId: task.id, type: 'TASK_OVERDUE' },
  });

  // An edit may lower the flag even though only the sweep raises it.
  await prisma.task.update({
    where: { id: task.id },
    data: { dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const afterPush = await flagOverdueTasks();
  const stillFlagged = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });

  await prisma.task.delete({ where: { id: task.id } });

  const results = [
    ['sweep flags a past due task', first.flagged >= 1],
    ['flag and timestamp are persisted', afterFirst.isOverdue === true && afterFirst.overdueAt !== null],
    ['sweep writes an activity log row', logs === 1],
    ['sweep notifies the assignee', notifications === 1],
    ['a second sweep is a no-op for the same task', second.flagged === 0 && logsAfterSecond === 1],
    ['a future due date is not re-flagged by the sweep', afterPush.flagged === 0],
    ['the flag stays raised until an edit clears it', stillFlagged.isOverdue === true],
  ] as const;

  for (const [name, ok] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
};

main().finally(() => prisma.$disconnect());
