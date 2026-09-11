import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from '../lib/format';
import { Button } from './ui/Button';
import { Input, Label, Select } from './ui/Field';
import type { TaskPriority, TaskStatus } from '../types';

const API_PARAMS = [
  'projectId',
  'assigneeId',
  'status',
  'priority',
  'dueFrom',
  'dueTo',
  'overdue',
  'search',
  'sort',
  'order',
  'limit',
] as const;

// Filters live in the URL, so the query string is both the component state and
// a shareable link; the API takes the same parameter names.
export const useTaskQuery = () => {
  const [params] = useSearchParams();

  return useMemo(() => {
    const query = new URLSearchParams();
    for (const key of API_PARAMS) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    if (!query.has('limit')) query.set('limit', '100');
    return query.toString();
  }, [params]);
};

const csv = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

type Props = {
  assignees?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
};

export const TaskFilters = ({ assignees, projects }: Props) => {
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const statuses = csv(params.get('status'));
  const priorities = csv(params.get('priority'));

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const toggleList = (key: 'status' | 'priority', value: string) => {
    const current = csv(params.get(key));
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    update(key, next.join(','));
  };

  const activeCount = API_PARAMS.filter((key) => key !== 'limit' && params.get(key)).length;

  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="task-search">Search</Label>
          <Input
            id="task-search"
            placeholder="Title or description"
            defaultValue={params.get('search') ?? ''}
            onChange={(event) => update('search', event.target.value.trim() || null)}
          />
        </div>

        <div>
          <Label htmlFor="due-from">Due from</Label>
          <Input
            id="due-from"
            type="date"
            value={params.get('dueFrom')?.slice(0, 10) ?? ''}
            onChange={(event) => update('dueFrom', event.target.value || null)}
          />
        </div>

        <div>
          <Label htmlFor="due-to">Due to</Label>
          <Input
            id="due-to"
            type="date"
            value={params.get('dueTo')?.slice(0, 10) ?? ''}
            onChange={(event) => update('dueTo', event.target.value || null)}
          />
        </div>

        {projects && projects.length > 0 ? (
          <div>
            <Label htmlFor="filter-project">Project</Label>
            <Select
              id="filter-project"
              value={params.get('projectId') ?? ''}
              onChange={(event) => update('projectId', event.target.value || null)}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {assignees && assignees.length > 0 ? (
          <div>
            <Label htmlFor="filter-assignee">Assignee</Label>
            <Select
              id="filter-assignee"
              value={params.get('assigneeId') ?? ''}
              onChange={(event) => update('assigneeId', event.target.value || null)}
            >
              <option value="">Anyone</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="filter-sort">Sort</Label>
          <Select
            id="filter-sort"
            value={`${params.get('sort') ?? 'priority'}:${params.get('order') ?? 'desc'}`}
            onChange={(event) => {
              const [sort, order] = event.target.value.split(':');
              const next = new URLSearchParams(params);
              next.set('sort', sort!);
              next.set('order', order!);
              setParams(next, { replace: true });
            }}
          >
            <option value="priority:desc">Priority, highest first</option>
            <option value="dueDate:asc">Due date, soonest first</option>
            <option value="dueDate:desc">Due date, latest first</option>
            <option value="createdAt:desc">Newest first</option>
            <option value="status:asc">Status</option>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted">Status</span>
        {STATUS_ORDER.map((status: TaskStatus) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleList('status', status)}
            className={clsx(
              'rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors duration-150',
              statuses.includes(status)
                ? 'bg-accent text-accent-ink ring-accent'
                : 'bg-surface text-muted ring-line hover:bg-raised',
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted">Priority</span>
        {PRIORITY_ORDER.map((priority: TaskPriority) => (
          <button
            key={priority}
            type="button"
            onClick={() => toggleList('priority', priority)}
            className={clsx(
              'rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors duration-150',
              priorities.includes(priority)
                ? 'bg-accent text-accent-ink ring-accent'
                : 'bg-surface text-muted ring-line hover:bg-raised',
            )}
          >
            {PRIORITY_LABELS[priority]}
          </button>
        ))}

        <button
          type="button"
          onClick={() => update('overdue', params.get('overdue') === 'true' ? null : 'true')}
          className={clsx(
            'ml-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors duration-150',
            params.get('overdue') === 'true'
              ? 'bg-danger text-white ring-danger'
              : 'bg-surface text-muted ring-line hover:bg-raised',
          )}
        >
          Overdue only
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Link copied' : 'Copy filter link'}
        </Button>
        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
