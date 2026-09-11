import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { TaskDialog } from '../components/TaskDialog';
import { PageHeader } from '../components/layout/AppShell';
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
      <PageHeader
        title={data.title}
        breadcrumbs={[
          { label: 'Projects', to: '/projects' },
          { label: data.project.name, to: `/projects/${data.project.id}` },
          { label: `Task #${data.number}` },
        ]}
        actions={
          <>
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
          </>
        }
      />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={data.status} />
        <PriorityBadge priority={data.priority} />
        {data.isOverdue ? <OverdueBadge /> : null}
        <span className={clsx('text-xs', data.isOverdue ? 'text-danger' : 'text-muted')}>
          {dueLabel(data)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Description" />
          <div className="px-4 py-3 text-sm whitespace-pre-wrap text-ink">
            {data.description || <span className="text-subtle">No description</span>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Details" />
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-muted">Assignee</dt>
              <dd className="flex items-center gap-1.5">
                {data.assignee ? (
                  <>
                    <Avatar name={data.assignee.name} className="size-6 text-[10px]" />
                    <span className="text-xs text-ink">{data.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-subtle">Unassigned</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-muted">Due date</dt>
              <dd className="text-xs text-ink">{formatDate(data.dueDate)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-muted">Created by</dt>
              <dd className="text-xs text-ink">{data.createdBy.name}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-xs text-muted">Created</dt>
              <dd className="text-xs text-ink">{formatDateTime(data.createdAt)}</dd>
            </div>
            {data.completedAt ? (
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-xs text-muted">Completed</dt>
                <dd className="text-xs text-ink">{formatDateTime(data.completedAt)}</dd>
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
        <ol className="divide-y divide-line">
          {(activity.data?.items ?? []).map((item) => (
            <li key={item.id} className="px-4 py-2.5">
              <p className="text-sm text-ink">{item.message}</p>
              <p className="mt-0.5 text-xs text-subtle">
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
