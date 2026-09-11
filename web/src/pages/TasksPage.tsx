import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { TaskFilters, useTaskQuery } from '../components/TaskFilters';
import { TaskBoard, TaskList } from '../components/TaskList';
import { TaskDialog } from '../components/TaskDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, Loading } from '../components/ui/Feedback';
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'DEVELOPER'
              ? 'Only the tasks assigned to you'
              : 'Filters are stored in the URL and can be shared'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {(['list', 'board'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition',
                  view === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600',
                )}
              >
                {option}
              </button>
            ))}
          </div>
          {canManage ? <Button onClick={() => setDialogOpen(true)}>New task</Button> : null}
        </div>
      </div>

      <TaskFilters
        projects={projects.data?.items.map((project) => ({ id: project.id, name: project.name }))}
        assignees={
          canManage
            ? developers.data?.items.map((developer) => ({ id: developer.id, name: developer.name }))
            : undefined
        }
      />

      {tasks.isPending ? <Loading label="Loading tasks" /> : null}
      {tasks.isError ? <ErrorState error={tasks.error} /> : null}

      {tasks.isSuccess ? (
        <>
          <p className="text-xs text-slate-500">
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
