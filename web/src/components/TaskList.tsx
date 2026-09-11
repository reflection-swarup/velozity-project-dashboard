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
      className="w-36 py-1 text-xs"
      value={task.status}
      disabled={updateStatus.isPending}
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
  const canMove =
    user?.role !== 'DEVELOPER' || task.assignee?.id === user.id;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
      <Link to={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 tabular-nums">#{task.number}</span>
          <span className="truncate text-sm font-medium text-slate-900">{task.title}</span>
          {task.isOverdue ? <OverdueBadge /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {showProject ? <span className="truncate">{task.project.name}</span> : null}
          <span className={clsx(task.isOverdue && 'font-medium text-rose-600')}>
            {dueLabel(task)}
          </span>
          <span>· updated {relativeTime(task.updatedAt)}</span>
        </div>
      </Link>

      <PriorityBadge priority={task.priority} />

      {task.assignee ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <Avatar name={task.assignee.name} className="size-6 text-[10px]" />
          <span className="hidden sm:inline">{task.assignee.name}</span>
        </span>
      ) : (
        <span className="text-xs text-slate-400">Unassigned</span>
      )}

      {canMove ? <StatusPicker task={task} /> : <StatusBadge status={task.status} />}
    </li>
  );
};

export const TaskList = ({ tasks, showProject = true }: { tasks: Task[]; showProject?: boolean }) => (
  <ul className="divide-y divide-slate-100">
    {tasks.map((task) => (
      <TaskRow key={task.id} task={task} showProject={showProject} />
    ))}
  </ul>
);

export const TaskBoard = ({ tasks }: { tasks: Task[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {STATUS_ORDER.map((status) => {
      const column = tasks.filter((task) => task.status === status);
      return (
        <div key={status} className="rounded-xl bg-slate-100/70 p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold text-slate-700">{STATUS_LABELS[status]}</span>
            <span className="text-xs text-slate-500 tabular-nums">{column.length}</span>
          </div>
          <div className="space-y-2">
            {column.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="block rounded-lg bg-white p-3 ring-1 ring-slate-200 hover:ring-indigo-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400 tabular-nums">
                    #{task.number}
                  </span>
                  <PriorityBadge priority={task.priority} />
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900">{task.title}</p>
                <p
                  className={clsx(
                    'mt-1 text-xs',
                    task.isOverdue ? 'font-medium text-rose-600' : 'text-slate-500',
                  )}
                >
                  {dueLabel(task)}
                </p>
                {task.assignee ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Avatar name={task.assignee.name} className="size-6 text-[10px]" />
                    <span className="text-xs text-slate-600">{task.assignee.name}</span>
                  </div>
                ) : null}
              </Link>
            ))}
            {column.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-400">Nothing here</p>
            ) : null}
          </div>
        </div>
      );
    })}
  </div>
);
