import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { TaskFilters, useTaskQuery } from '../components/TaskFilters';
import { TaskBoard, TaskList } from '../components/TaskList';
import { TaskDialog } from '../components/TaskDialog';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, ListSkeleton } from '../components/ui/Feedback';
import { useProjects, useTasks, useUsers } from '../hooks/queries';
import { useAuth } from '../auth/AuthProvider';

export const TasksPage = () => {
  const { user, hasRole } = useAuth();
  const query = useTaskQuery();
  const tasks = useTasks(query);
  const projects = useProjects();
  const canManage = hasRole('ADMIN', 'PROJECT_MANAGER');
  const developers = useUsers(canManage ? 'DEVELOPER' : undefined);
  const [params, setParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);

  const view = params.get('view') === 'board' ? 'board' : 'list';
  const setView = (next: 'list' | 'board') => {
    const updated = new URLSearchParams(params);
    updated.set('view', next);
    setParams(updated, { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={user?.role === 'DEVELOPER' ? 'My tasks' : 'Tasks'}
        description={
          user?.role === 'DEVELOPER'
            ? 'Only the tasks assigned to you'
            : 'Every filter is stored in the URL, so this view is shareable as a link'
        }
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Tasks' }]}
        actions={
          <>
            <div className="flex rounded-lg bg-raised p-0.5">
              {(['list', 'board'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  className={clsx(
                    'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-150',
                    view === option ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {canManage ? <Button onClick={() => setDialogOpen(true)}>New task</Button> : null}
          </>
        }
      />

      <TaskFilters
        projects={projects.data?.items.map((project) => ({ id: project.id, name: project.name }))}
        assignees={
          canManage
            ? developers.data?.items.map((developer) => ({ id: developer.id, name: developer.name }))
            : undefined
        }
      />

      {tasks.isPending ? (
        <Card className="overflow-hidden">
          <ListSkeleton rows={6} />
        </Card>
      ) : null}
      {tasks.isError ? <ErrorState error={tasks.error} /> : null}

      {tasks.isSuccess ? (
        <>
          <p className="text-xs text-muted">
            {tasks.data.total} task{tasks.data.total === 1 ? '' : 's'} match
          </p>

          {tasks.data.items.length === 0 ? (
            <Card>
              <EmptyState title="No tasks match these filters" hint="Try clearing a filter" />
            </Card>
          ) : view === 'board' ? (
            <TaskBoard tasks={tasks.data.items} />
          ) : (
            <Card className="overflow-hidden">
              <TaskList tasks={tasks.data.items} />
            </Card>
          )}
        </>
      ) : null}

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
