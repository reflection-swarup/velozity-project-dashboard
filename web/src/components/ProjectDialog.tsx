import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  useClients,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
  useUsers,
} from '../hooks/queries';
import { PROJECT_STATUS_LABELS } from '../lib/format';
import { Button } from './ui/Button';
import { Field, Input, Select, Textarea } from './ui/Field';
import { FormError } from './ui/Feedback';
import { Modal } from './ui/Modal';
import type { Project, ProjectStatus } from '../types';

const STATUSES: ProjectStatus[] = ['ACTIVE', 'ON_HOLD', 'COMPLETED'];

type Props = {
  open: boolean;
  onClose: () => void;
  project?: Project;
  onDeleted?: () => void;
};

export const ProjectDialog = ({ open, onClose, project, onDeleted }: Props) => {
  const { hasRole } = useAuth();
  const clients = useClients();
  const managers = useUsers('PROJECT_MANAGER');
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [form, setForm] = useState({
    name: '',
    description: '',
    clientId: '',
    managerId: '',
    status: 'ACTIVE' as ProjectStatus,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: project?.name ?? '',
      description: project?.description ?? '',
      clientId: project?.clientId ?? '',
      managerId: project?.managerId ?? '',
      status: project?.status ?? 'ACTIVE',
    });
  }, [open, project]);

  const mutation = project ? updateProject : createProject;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const shared = {
      name: form.name.trim(),
      description: form.description.trim(),
      clientId: form.clientId,
      status: form.status,
    };

    if (project) {
      updateProject.mutate(
        {
          id: project.id,
          ...shared,
          // Only an admin may reassign a project, so a manager never sends it.
          ...(hasRole('ADMIN') && form.managerId ? { managerId: form.managerId } : {}),
        },
        { onSuccess: onClose },
      );
    } else {
      createProject.mutate(
        { ...shared, ...(hasRole('ADMIN') && form.managerId ? { managerId: form.managerId } : {}) },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal
      open={open}
      title={project ? 'Edit project' : 'New project'}
      description={
        project ? 'Put a project on hold or mark it complete here.' : undefined
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving' : project ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-3">
        <FormError error={mutation.error ?? deleteProject.error} />

        <Field label="Name" htmlFor="project-name">
          <Input
            id="project-name"
            required
            minLength={3}
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            maxLength={2000}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
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
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Status"
            htmlFor="project-status"
            hint={form.status === 'ON_HOLD' ? 'Work is paused but stays visible' : undefined}
          >
            <Select
              id="project-status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as ProjectStatus })
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {hasRole('ADMIN') ? (
          <Field
            label="Project manager"
            htmlFor="project-manager"
            hint="Only an admin can reassign a project"
          >
            <Select
              id="project-manager"
              value={form.managerId}
              onChange={(event) => setForm({ ...form, managerId: event.target.value })}
            >
              <option value="">{project ? 'Keep current manager' : 'Assign to me'}</option>
              {(managers.data?.items ?? []).map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {project ? (
          <div className="mt-5 rounded-lg bg-danger-soft px-3 py-3">
            <p className="text-[13px] font-semibold text-danger">Delete this project</p>
            <p className="mt-1 text-[13px] text-muted">
              Its tasks go with it and the history cannot be recovered. Put the project on hold
              instead if the work is only paused.
            </p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-2.5"
              disabled={deleteProject.isPending}
              onClick={() => {
                if (!window.confirm(`Delete ${project.name} and all ${project.taskTotal} of its tasks?`)) {
                  return;
                }
                deleteProject.mutate(project.id, {
                  onSuccess: () => {
                    onClose();
                    onDeleted?.();
                  },
                });
              }}
            >
              {deleteProject.isPending ? 'Deleting' : 'Delete project'}
            </Button>
          </div>
        ) : null}
      </form>
    </Modal>
  );
};
