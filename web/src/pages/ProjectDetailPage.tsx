import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskBoard } from '../components/TaskList';
import { TaskDialog } from '../components/TaskDialog';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState, ErrorState, Loading } from '../components/ui/Feedback';
import { useProject, useTasks } from '../hooks/queries';
import { useAuth } from '../auth/AuthProvider';
import { ROLE_LABELS } from '../lib/format';

export const ProjectDetailPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const project = useProject(id);
  const tasks = useTasks(`projectId=${id}&limit=100&sort=priority&order=desc`);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canManage =
    user?.role === 'ADMIN' || (user?.role === 'PROJECT_MANAGER' && project.data?.managerId === user.id);

  if (project.isPending) return <Loading label="Loading project" />;
  if (project.isError) return <ErrorState error={project.error} />;

  const data = project.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{data.name}</h1>
            <ProjectStatusBadge status={data.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {data.client.name} · {data.client.company} · managed by {data.manager.name}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{data.description}</p>
        </div>
        {canManage ? <Button onClick={() => setDialogOpen(true)}>New task</Button> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tasks" value={data.taskTotal} />
        <StatCard label="In progress" value={data.taskCounts.IN_PROGRESS} />
        <StatCard label="In review" value={data.taskCounts.IN_REVIEW} />
        <StatCard
          label="Overdue"
          value={data.overdueCount}
          tone={data.overdueCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {user?.role === 'DEVELOPER' ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          You are seeing only the tasks assigned to you on this project.
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Board</h2>
        <Link to={`/tasks?projectId=${id}`} className="text-xs text-indigo-600 hover:underline">
          Open in task list with filters
        </Link>
      </div>

      {tasks.isPending ? <Loading label="Loading tasks" /> : null}
      {tasks.isError ? <ErrorState error={tasks.error} /> : null}
      {tasks.isSuccess ? (
        tasks.data.items.length === 0 ? (
          <Card>
            <EmptyState title="No tasks on this project yet" />
          </Card>
        ) : (
          <TaskBoard tasks={tasks.data.items} />
        )
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <ActivityFeed
          projectId={id}
          title="Project activity"
          subtitle="Live for everyone viewing this project"
          className="lg:col-span-2"
        />

        <Card className="overflow-hidden">
          <CardHeader title="Team" subtitle={`${data.members?.length ?? 0} members`} />
          {data.members && data.members.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {data.members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={member.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[member.role]}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No members added" />
          )}
        </Card>
      </div>

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} defaultProjectId={id} />
    </div>
  );
};
