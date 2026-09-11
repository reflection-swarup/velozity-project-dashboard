import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskBoard } from '../components/TaskList';
import { TaskDialog } from '../components/TaskDialog';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { Avatar, AvatarStack } from '../components/ui/Avatar';
import { CardSkeleton, EmptyState, ErrorState, ListSkeleton } from '../components/ui/Feedback';
import { useProject, useTasks } from '../hooks/queries';
import { useAuth } from '../auth/AuthProvider';
import { ROLE_LABELS, STATUS_LABELS, STATUS_ORDER } from '../lib/format';
import type { StatusCounts } from '../types';

const Progress = ({ counts, total }: { counts: StatusCounts; total: number }) => {
  const done = counts.DONE;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-ink tabular-nums">{percent}%</span>
        <span className="text-xs text-muted">
          {done} of {total} done
        </span>
      </div>

      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-raised">
        {STATUS_ORDER.map((status) => {
          const width = total === 0 ? 0 : (counts[status] / total) * 100;
          if (width === 0) return null;
          return (
            <span
              key={status}
              title={`${STATUS_LABELS[status]}: ${counts[status]}`}
              style={{ width: `${width}%` }}
              className={clsx(
                status === 'TODO' && 'bg-line-strong',
                status === 'IN_PROGRESS' && 'bg-info',
                status === 'IN_REVIEW' && 'bg-warn',
                status === 'DONE' && 'bg-success',
              )}
            />
          );
        })}
      </div>

      <dl className="mt-3 space-y-1.5">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex items-center justify-between text-xs">
            <dt className="flex items-center gap-2 text-muted">
              <span
                className={clsx(
                  'size-1.5 rounded-full',
                  status === 'TODO' && 'bg-line-strong',
                  status === 'IN_PROGRESS' && 'bg-info',
                  status === 'IN_REVIEW' && 'bg-warn',
                  status === 'DONE' && 'bg-success',
                )}
              />
              {STATUS_LABELS[status]}
            </dt>
            <dd className="font-medium text-ink tabular-nums">{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export const ProjectDetailPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const project = useProject(id);
  const tasks = useTasks(`projectId=${id}&limit=100&sort=priority&order=desc`);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canManage =
    user?.role === 'ADMIN' ||
    (user?.role === 'PROJECT_MANAGER' && project.data?.managerId === user.id);

  if (project.isPending) return <CardSkeleton count={4} />;
  if (project.isError) return <ErrorState error={project.error} />;

  const data = project.data;
  const members = data.members ?? [];

  return (
    <div>
      <PageHeader
        title={data.name}
        description={`${data.client.name} · ${data.client.company} · managed by ${data.manager.name}`}
        breadcrumbs={[{ label: 'Projects', to: '/projects' }, { label: data.name }]}
        actions={
          <>
            {members.length > 0 ? <AvatarStack names={members.map((m) => m.name)} /> : null}
            <ProjectStatusBadge status={data.status} />
            {canManage ? <Button onClick={() => setDialogOpen(true)}>New task</Button> : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {data.description ? (
            <p className="mb-4 max-w-3xl text-md leading-relaxed text-muted">{data.description}</p>
          ) : null}

          {user?.role === 'DEVELOPER' ? (
            <p className="mb-4 rounded-lg bg-raised px-3 py-2.5 text-[13px] text-muted">
              This project view is scoped to the tasks assigned to you.
            </p>
          ) : null}

          <Section
            title="Board"
            description="Tasks grouped by status"
            action={
              <Link
                to={`/tasks?projectId=${id}`}
                className="text-[13px] font-medium text-accent transition-colors hover:underline"
              >
                Open in task list with filters
              </Link>
            }
          >
            {tasks.isPending ? (
              <Card className="overflow-hidden">
                <ListSkeleton rows={4} />
              </Card>
            ) : null}
            {tasks.isError ? <ErrorState error={tasks.error} /> : null}
            {tasks.isSuccess ? (
              tasks.data.items.length === 0 ? (
                <Card>
                  <EmptyState
                    title="No tasks on this project yet"
                    hint={canManage ? 'Create the first task to get the board moving' : undefined}
                    action={
                      canManage ? <Button onClick={() => setDialogOpen(true)}>New task</Button> : undefined
                    }
                  />
                </Card>
              ) : (
                <TaskBoard tasks={tasks.data.items} />
              )
            ) : null}
          </Section>

          <Section title="Activity" description="Live for everyone viewing this project">
            <ActivityFeed projectId={id} title="Project activity" />
          </Section>
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Project stats" subtitle="Completion by status" />
            <Progress counts={data.taskCounts} total={data.taskTotal} />
            {data.overdueCount > 0 ? (
              <div className="border-t border-line px-4 py-3">
                <Link
                  to={`/tasks?projectId=${id}&overdue=true`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-danger">
                    {data.overdueCount} overdue task{data.overdueCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-muted">View</span>
                </Link>
              </div>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Team" subtitle={`${members.length} members`} />
            {members.length > 0 ? (
              <ul className="divide-y divide-line">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={member.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                      <p className="text-xs text-muted">{ROLE_LABELS[member.role]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No members added" />
            )}
          </Card>
        </aside>
      </div>

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} defaultProjectId={id} />
    </div>
  );
};
