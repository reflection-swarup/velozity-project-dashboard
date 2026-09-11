import { useSearchParams } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { Select } from '../components/ui/Field';
import { useProjects } from '../hooks/queries';
import { useAuth } from '../auth/AuthProvider';

export const ActivityPage = () => {
  const { user } = useAuth();
  const projects = useProjects();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('projectId') ?? '';

  const scopeNote =
    user?.role === 'ADMIN'
      ? 'You see activity across every project'
      : user?.role === 'PROJECT_MANAGER'
        ? 'You see activity from the projects you manage'
        : 'You see activity on tasks assigned to you';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Activity</h1>
          <p className="text-sm text-slate-500">{scopeNote}</p>
        </div>

        {user?.role !== 'DEVELOPER' ? (
          <Select
            aria-label="Filter by project"
            className="w-60"
            value={projectId}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value) next.set('projectId', event.target.value);
              else next.delete('projectId');
              setParams(next, { replace: true });
            }}
          >
            <option value="">All projects I can see</option>
            {(projects.data?.items ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <ActivityFeed
        key={projectId || 'all'}
        projectId={projectId || undefined}
        title={projectId ? 'Project activity' : 'All activity'}
        showMissed
      />
    </div>
  );
};
