import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { TaskDialog } from '../components/TaskDialog';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState, ErrorState, Loading } from '../components/ui/Feedback';
import { Select } from '../components/ui/Field';
import { useDeleteTask, useTask, useTaskActivity, useUpdateTaskStatus } from '../hooks/queries';
import { useAuth } from '../auth/AuthProvider';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  dueLabel,
  formatDate,
  formatDateTime,
  relativeTime,
} from '../lib/format';
import type { TaskStatus } from '../types';

export const TaskDetailPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const task = useTask(id);
  const activity = useTaskActivity(id);
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [editOpen, setEditOpen] = useState(false);

  if (task.isPending) return <Loading label="Loading task" />;
  if (task.isError) return <ErrorState error={task.error} />;

  const data = task.data;
  const isAdmin = user?.role === 'ADMIN';
  const isOwningManager = user?.role === 'PROJECT_MANAGER' && data.project.managerId === user.id;
  const isAssignee = data.assignee?.id === user?.id;
  const canEdit = isAdmin || isOwningManager;
  const canMove = canEdit || isAssignee;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            <Link to={`/projects/${data.project.id}`} className="hover:underline">
              {data.project.name}
            </Link>
            <span> · Task #{data.number}</span>
          </p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">{data.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <PriorityBadge priority={data.priority} />
            {data.isOverdue ? <OverdueBadge /> : null}
            <span className={clsx('text-xs', data.isOverdue ? 'text-rose-600' : 'text-slate-500')}>
              {dueLabel(data)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canMove ? (
            <Select
              aria-label="Change status"
              className="w-40"
              value={data.status}
              disabled={updateStatus.isPending}
              onChange={(event) =>
                updateStatus.mutate({ id: data.id, status: event.target.value as TaskStatus })
              }
            >
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          ) : null}
          {canEdit ? (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                variant="danger"
                disabled={deleteTask.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete Task #${data.number}?`)) return;
                  deleteTask.mutate(data.id, { onSuccess: () => navigate('/tasks') });
                }}
              >
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Description" />
          <div className="px-4 py-3 text-sm whitespace-pre-wrap text-slate-700">
            {data.description || <span className="text-slate-400">No description</span>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Details" />
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-slate-500">Assignee</dt>
              <dd className="flex items-center gap-1.5">
                {data.assignee ? (
                  <>
                    <Avatar name={data.assignee.name} className="size-6 text-[10px]" />
                    <span className="text-xs text-slate-700">{data.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Unassigned</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-slate-500">Due date</dt>
              <dd className="text-xs text-slate-700">{formatDate(data.dueDate)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-slate-500">Created by</dt>
              <dd className="text-xs text-slate-700">{data.createdBy.name}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-slate-500">Created</dt>
              <dd className="text-xs text-slate-700">{formatDateTime(data.createdAt)}</dd>
            </div>
            {data.completedAt ? (
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-xs text-slate-500">Completed</dt>
                <dd className="text-xs text-slate-700">{formatDateTime(data.completedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Task history" subtitle="Stored in the database, never derived" />
        {activity.isPending ? <Loading label="Loading history" /> : null}
        {activity.isError ? <ErrorState error={activity.error} /> : null}
        {activity.isSuccess && activity.data.items.length === 0 ? (
          <EmptyState title="No history yet" />
        ) : null}
        <ol className="divide-y divide-slate-100">
          {(activity.data?.items ?? []).map((item) => (
            <li key={item.id} className="px-4 py-2.5">
              <p className="text-sm text-slate-800">{item.message}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDateTime(item.createdAt)} · {relativeTime(item.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <TaskDialog open={editOpen} onClose={() => setEditOpen(false)} task={data} />
    </div>
  );
};
