import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskBoard } from '../components/TaskList';
import { TaskDialog } from '../components/TaskDialog';
import { ProjectDialog } from '../components/ProjectDialog';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Field, Select } from '../components/ui/Field';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { Avatar, AvatarStack } from '../components/ui/Avatar';
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  FormError,
  ListSkeleton,
} from '../components/ui/Feedback';
import {
  useAddProjectMember,
  useProject,
  useRemoveProjectMember,
  useTasks,
  useUpdateProject,
  useUsers,
} from '../hooks/queries';
import { useAuth } from '../auth/AuthProvider';
import { PROJECT_STATUS_LABELS, ROLE_LABELS, STATUS_LABELS, STATUS_ORDER } from '../lib/format';
import type { ProjectStatus, Role, StatusCounts } from '../types';

const PROJECT_STATUSES: ProjectStatus[] = ['ACTIVE', 'ON_HOLD', 'COMPLETED'];

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

const TeamPanel = ({
  projectId,
  members,
  canManage,
}: {
  projectId: string;
  members: { id: string; name: string; email: string; role: Role }[];
  canManage: boolean;
}) => {
  const developers = useUsers(canManage ? 'DEVELOPER' : undefined);
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const [selected, setSelected] = useState('');

  const memberIds = new Set(members.map((member) => member.id));
  const available = (developers.data?.items ?? []).filter(
    (developer) => developer.isActive && !memberIds.has(developer.id),
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Team"
        subtitle={
          canManage
            ? `${members.length} on this project · you decide who works here`
            : `${members.length} members`
        }
      />

      {members.length > 0 ? (
        <ul className="divide-y divide-line">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={member.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-medium text-ink">{member.name}</p>
                <p className="truncate text-[13px] text-muted">{ROLE_LABELS[member.role]}</p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removeMember.isPending}
                  onClick={() => {
                    if (!window.confirm(`Remove ${member.name} from this project?`)) return;
                    removeMember.mutate({ projectId, userId: member.id });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nobody on this project yet"
          hint={canManage ? 'Add a developer below to get started' : undefined}
        />
      )}

      {canManage ? (
        <div className="space-y-2 border-t border-line px-4 py-3">
          <FormError error={addMember.error ?? removeMember.error} />
          <Field label="Add a developer" htmlFor="add-member">
            <Select
              id="add-member"
              value={selected}
              disabled={developers.isPending || available.length === 0}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">
                {available.length === 0 ? 'Everyone is already on this project' : 'Select a developer'}
              </option>
              {available.map((developer) => (
                <option key={developer.id} value={developer.id}>
                  {developer.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            size="sm"
            className="w-full"
            disabled={!selected || addMember.isPending}
            onClick={() =>
              addMember.mutate(
                { projectId, userId: selected },
                { onSuccess: () => setSelected('') },
              )
            }
          >
            {addMember.isPending ? 'Adding' : 'Add to project'}
          </Button>
        </div>
      ) : null}
    </Card>
  );
};

export const ProjectDetailPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const project = useProject(id);
  const tasks = useTasks(`projectId=${id}&limit=100&sort=priority&order=desc`);
  const updateProject = useUpdateProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
            {canManage ? (
              <Select
                aria-label="Project status"
                className="w-36"
                value={data.status}
                disabled={updateProject.isPending}
                onChange={(event) =>
                  updateProject.mutate({
                    id: data.id,
                    status: event.target.value as ProjectStatus,
                  })
                }
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            ) : (
              <ProjectStatusBadge status={data.status} />
            )}
            {canManage ? (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            ) : null}
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

          <TeamPanel projectId={id} members={members} canManage={Boolean(canManage)} />
        </aside>
      </div>

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} defaultProjectId={id} />
      <ProjectDialog open={editOpen} onClose={() => setEditOpen(false)} project={data} />
    </div>
  );
};
