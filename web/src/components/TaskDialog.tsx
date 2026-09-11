import { useEffect, useState } from 'react';
import { useCreateTask, useProjects, useUpdateTask, useUsers } from '../hooks/queries';
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '../lib/format';
import { Button } from './ui/Button';
import { Field, Input, Select, Textarea } from './ui/Field';
import { FormError } from './ui/Feedback';
import { Modal } from './ui/Modal';
import type { Task, TaskPriority, TaskStatus } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultProjectId?: string;
};

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export const TaskDialog = ({ open, onClose, task, defaultProjectId }: Props) => {
  const projects = useProjects();
  const developers = useUsers('DEVELOPER');
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [form, setForm] = useState({
    projectId: defaultProjectId ?? '',
    title: '',
    description: '',
    status: 'TODO' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    dueDate: '',
    assigneeId: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      projectId: task?.project.id ?? defaultProjectId ?? '',
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      dueDate: toDateInput(task?.dueDate ?? null),
      assigneeId: task?.assignee?.id ?? '',
    });
  }, [open, task, defaultProjectId]);

  const mutation = task ? updateTask : createTask;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(`${form.dueDate}T17:00:00`).toISOString() : null,
      assigneeId: form.assigneeId || null,
    };

    if (task) {
      updateTask.mutate({ id: task.id, ...payload }, { onSuccess: onClose });
    } else {
      createTask.mutate({ ...payload, projectId: form.projectId }, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      open={open}
      title={task ? `Edit Task #${task.number}` : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="task-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving' : task ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-3">
        <FormError error={mutation.error} />

        {task ? null : (
          <Field label="Project" htmlFor="task-project">
            <Select
              id="task-project"
              required
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            >
              <option value="">Select a project</option>
              {(projects.data?.items ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Title" htmlFor="task-title">
          <Input
            id="task-title"
            required
            minLength={3}
            maxLength={160}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>

        <Field label="Description" htmlFor="task-description">
          <Textarea
            id="task-description"
            maxLength={4000}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status" htmlFor="task-status">
            <Select
              id="task-status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
            >
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="task-priority">
            <Select
              id="task-priority"
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as TaskPriority })
              }
            >
              {PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Due date" htmlFor="task-due">
            <Input
              id="task-due"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>

          <Field label="Assigned developer" htmlFor="task-assignee">
            <Select
              id="task-assignee"
              value={form.assigneeId}
              onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}
            >
              <option value="">Unassigned</option>
              {(developers.data?.items ?? []).map((developer) => (
                <option key={developer.id} value={developer.id}>
                  {developer.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
};
