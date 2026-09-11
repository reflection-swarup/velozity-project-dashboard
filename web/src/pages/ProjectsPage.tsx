import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useClients, useCreateProject, useProjects, useUsers } from '../hooks/queries';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState, FormError, Loading } from '../components/ui/Feedback';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/format';

const NewProjectDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { hasRole } = useAuth();
  const clients = useClients();
  const managers = useUsers('PROJECT_MANAGER');
  const createProject = useCreateProject();
  const [form, setForm] = useState({ name: '', description: '', clientId: '', managerId: '' });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createProject.mutate(
      {
        name: form.name.trim(),
        description: form.description.trim(),
        clientId: form.clientId,
        ...(form.managerId ? { managerId: form.managerId } : {}),
      },
      {
        onSuccess: () => {
          setForm({ name: '', description: '', clientId: '', managerId: '' });
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title="New project"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={createProject.isPending}>
            {createProject.isPending ? 'Creating' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-3">
        <FormError error={createProject.error} />

        <Field label="Name" htmlFor="project-name">
          <Input
            id="project-name"
            required
            minLength={3}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        <Field label="Client" htmlFor="project-client">
          <Select
            id="project-client"
            required
            value={form.clientId}
            onChange={(event) => setForm({ ...form, clientId: event.target.value })}
          >
            <option value="">Select a client</option>
            {(clients.data?.items ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} · {client.company}
              </option>
            ))}
          </Select>
        </Field>

        {hasRole('ADMIN') ? (
          <Field label="Project manager" htmlFor="project-manager">
            <Select
              id="project-manager"
              value={form.managerId}
              onChange={(event) => setForm({ ...form, managerId: event.target.value })}
            >
              <option value="">Assign to me</option>
              {(managers.data?.items ?? []).map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </form>
    </Modal>
  );
};

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

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
