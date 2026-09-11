import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  activityKeys,
  clientKeys,
  dashboardKeys,
  notificationKeys,
  projectKeys,
  taskKeys,
  userKeys,
} from './keys';
import type {
  Activity,
  Client,
  Dashboard,
  ManagedUser,
  Notification,
  Paginated,
  Project,
  ProjectStatus,
  Role,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types';

export const useDashboard = () =>
  useQuery({
    queryKey: dashboardKeys.current,
    queryFn: ({ signal }) => api.get<Dashboard>('/api/dashboard', signal),
  });

export const useTasks = (query: string) =>
  useQuery({
    queryKey: taskKeys.list(query),
    queryFn: ({ signal }) =>
      api.get<Paginated<Task>>(`/api/tasks${query ? `?${query}` : ''}`, signal),
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => api.get<{ task: Task }>(`/api/tasks/${id}`, signal).then((r) => r.task),
  });

export const useTaskActivity = (id: string) =>
  useQuery({
    queryKey: taskKeys.activity(id),
    queryFn: ({ signal }) => api.get<{ items: Activity[] }>(`/api/tasks/${id}/activity`, signal),
  });

export const useProjects = (query = '') =>
  useQuery({
    queryKey: projectKeys.list(query),
    queryFn: ({ signal }) =>
      api.get<{ items: Project[] }>(`/api/projects${query ? `?${query}` : ''}`, signal),
  });

export const useProject = (id: string) =>
  useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get<{ project: Project }>(`/api/projects/${id}`, signal).then((r) => r.project),
  });

export const useActivityFeed = (projectId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: activityKeys.feed(projectId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (projectId) params.set('projectId', projectId);
      if (pageParam) params.set('cursor', pageParam);
      return api.get<Paginated<Activity>>(`/api/activity?${params.toString()}`, signal);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

// Reads straight from the database using the last seen timestamp the server
// persisted when our socket dropped.
export const useMissedActivity = () =>
  useQuery({
    queryKey: activityKeys.missed,
    queryFn: ({ signal }) =>
      api.get<{ since: string; items: Activity[] }>('/api/activity/missed?limit=20', signal),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useMarkCaughtUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/api/activity/seen'),
    onSuccess: () => {
      queryClient.setQueryData(activityKeys.missed, { since: new Date().toISOString(), items: [] });
    },
  });
};

export const useNotifications = () =>
  useQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ signal }) =>
      api.get<{ items: Notification[]; unreadCount: number }>('/api/notifications?limit=20', signal),
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ unreadCount: number }>(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<{ unreadCount: number }>('/api/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  });
};

export const useUsers = (role?: Role) =>
  useQuery({
    queryKey: userKeys.list(role),
    queryFn: ({ signal }) =>
      api.get<{ items: ManagedUser[] }>(`/api/users${role ? `?role=${role}` : ''}`, signal),
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string; role: Role }) =>
      api.post<{ user: ManagedUser }>('/api/users', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; role?: Role; isActive?: boolean }) =>
      api.patch<{ user: ManagedUser }>(`/api/users/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useClients = () =>
  useQuery({
    queryKey: clientKeys.list(),
    queryFn: ({ signal }) => api.get<{ items: Client[] }>('/api/clients', signal),
  });

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; company: string; contactEmail: string }) =>
      api.post<{ client: Client }>('/api/clients', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.list() }),
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.list() }),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description: string;
      clientId: string;
      managerId?: string;
      memberIds?: string[];
    }) => api.post<{ project: Project }>('/api/projects', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      description?: string;
      clientId?: string;
      managerId?: string;
      status?: ProjectStatus;
    }) => api.patch<{ project: Project }>(`/api/projects/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};

export type TaskInput = {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => api.post<{ task: Task }>('/api/tasks', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<TaskInput> & { id: string }) =>
      api.patch<{ task: Task }>(`/api/tasks/${id}`, input),
    onSuccess: (result) => {
      queryClient.setQueryData(taskKeys.detail(result.task.id), result.task);
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.patch<{ task: Task }>(`/api/tasks/${id}/status`, { status }),
    onSuccess: (result) => {
      queryClient.setQueryData(taskKeys.detail(result.task.id), result.task);
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.current });
    },
  });
};
