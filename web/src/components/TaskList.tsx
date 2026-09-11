import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../auth/AuthProvider';
import { useUpdateTaskStatus } from '../hooks/queries';
import { STATUS_LABELS, STATUS_ORDER, dueLabel, relativeTime } from '../lib/format';
import { OverdueBadge, PriorityBadge, StatusBadge } from './ui/Badge';
import { Avatar } from './ui/Avatar';
import { Select } from './ui/Field';
import type { Task, TaskStatus } from '../types';

const StatusPicker = ({ task }: { task: Task }) => {
  const updateStatus = useUpdateTaskStatus();

  return (
    <Select
      aria-label={`Status of task ${task.number}`}
      className="h-8 w-32 text-xs"
      value={task.status}
      disabled={updateStatus.isPending}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) =>
        updateStatus.mutate({ id: task.id, status: event.target.value as TaskStatus })
      }
    >
      {STATUS_ORDER.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </Select>
  );
};

export const TaskRow = ({ task, showProject = true }: { task: Task; showProject?: boolean }) => {
  const { user } = useAuth();
  const canMove = user?.role !== 'DEVELOPER' || task.assignee?.id === user.id;

  return (
    <li className="group relative flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-raised">
      <Link to={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-subtle tabular-nums">#{task.number}</span>
          <span className="truncate text-sm font-medium text-ink group-hover:text-accent">
            {task.title}
          </span>
          {task.isOverdue ? <OverdueBadge /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {showProject ? (
            <>
              <span className="truncate">{task.project.name}</span>
              <span className="text-subtle">·</span>
            </>
          ) : null}
          <span className={clsx(task.isOverdue && 'font-medium text-danger')}>{dueLabel(task)}</span>
          <span className="text-subtle">·</span>
          <span className="text-subtle">updated {relativeTime(task.updatedAt)}</span>
        </div>
      </Link>

      <PriorityBadge priority={task.priority} />

      {task.assignee ? (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Avatar name={task.assignee.name} className="size-6 text-[10px]" />
          <span className="hidden sm:inline">{task.assignee.name}</span>
        </span>
      ) : (
        <span className="text-xs text-subtle">Unassigned</span>
      )}

      {canMove ? <StatusPicker task={task} /> : <StatusBadge status={task.status} />}
    </li>
  );
};

export const TaskList = ({ tasks, showProject = true }: { tasks: Task[]; showProject?: boolean }) => (
  <ul className="divide-y divide-line">
    {tasks.map((task) => (
      <TaskRow key={task.id} task={task} showProject={showProject} />
    ))}
  </ul>
);

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: 'bg-subtle',
  IN_PROGRESS: 'bg-info',
  IN_REVIEW: 'bg-warn',
  DONE: 'bg-success',
};

export const TaskBoard = ({ tasks }: { tasks: Task[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {STATUS_ORDER.map((status) => {
      const column = tasks.filter((task) => task.status === status);

      return (
        <section key={status} className="rounded-xl bg-raised p-2">
          <header className="flex items-center gap-2 px-2 py-1.5">
            <span className={clsx('size-1.5 rounded-full', COLUMN_ACCENT[status])} />
            <span className="text-xs font-semibold text-ink">{STATUS_LABELS[status]}</span>
            <span className="ml-auto text-xs text-muted tabular-nums">{column.length}</span>
          </header>

          <div className="space-y-2">
            {column.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="block rounded-lg bg-surface p-3 ring-1 ring-line transition-shadow duration-150 hover:ring-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-subtle tabular-nums">#{task.number}</span>
                  <PriorityBadge priority={task.priority} />
                </div>

                <p className="mt-1.5 text-sm leading-snug font-medium text-ink">{task.title}</p>

                <p
                  className={clsx(
                    'mt-1.5 text-xs',
                    task.isOverdue ? 'font-medium text-danger' : 'text-muted',
                  )}
                >
                  {dueLabel(task)}
                </p>

                {task.assignee ? (
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
                    <Avatar name={task.assignee.name} className="size-6 text-[10px]" />
                    <span className="truncate text-xs text-muted">{task.assignee.name}</span>
                  </div>
                ) : null}
              </Link>
            ))}

            {column.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-subtle">Nothing here</p>
            ) : null}
          </div>
        </section>
      );
    })}
  </div>
);
