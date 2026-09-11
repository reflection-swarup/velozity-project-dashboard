import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useProjects } from '../hooks/queries';
import { ProjectDialog } from '../components/ProjectDialog';
import { EmptyState, ErrorState, Loading } from '../components/ui/Feedback';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/format';

export const ProjectsPage = () => {
  const { hasRole, user } = useAuth();
  const projects = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const canCreate = hasRole('ADMIN', 'PROJECT_MANAGER');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description={
          user?.role === 'ADMIN'
            ? 'Every client project across the agency'
            : user?.role === 'PROJECT_MANAGER'
              ? 'Projects you manage — another manager’s work is not visible here'
              : 'Projects you hold tasks on'
        }
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Projects' }]}
        actions={canCreate ? <Button onClick={() => setDialogOpen(true)}>New project</Button> : null}
      />

      {projects.isPending ? <Loading label="Loading projects" /> : null}
      {projects.isError ? <ErrorState error={projects.error} /> : null}

      {projects.isSuccess && projects.data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects to show"
            hint={canCreate ? 'Create your first project' : 'You have no tasks on any project yet'}
          />
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(projects.data?.items ?? []).map((project) => (
          <Card key={project.id} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/projects/${project.id}`}
                className="text-sm font-semibold text-ink hover:text-accent"
              >
                {project.name}
              </Link>
              <ProjectStatusBadge status={project.status} />
            </div>

            <p className="mt-1 text-xs text-muted">
              {project.client.name} · {project.client.company}
            </p>
            <p className="mt-2 line-clamp-2 text-xs text-muted">{project.description}</p>

            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3">
              {STATUS_ORDER.map((status) => (
                <div key={status}>
                  <p className="text-[11px] text-muted">{STATUS_LABELS[status]}</p>
                  <p className="text-sm font-semibold text-ink tabular-nums">
                    {project.taskCounts[status]}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted">Manager: {project.manager.name}</span>
              {project.overdueCount > 0 ? (
                <Link
                  to={`/tasks?projectId=${project.id}&overdue=true`}
                  className="font-medium text-danger hover:underline"
                >
                  {project.overdueCount} overdue
                </Link>
              ) : (
                <span className="text-subtle">On track</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <ProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
