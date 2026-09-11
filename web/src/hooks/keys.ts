export const dashboardKeys = {
  current: ['dashboard'] as const,
};

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => ['tasks', 'list'] as const,
  list: (query: string) => ['tasks', 'list', query] as const,
  detail: (id: string) => ['task', id] as const,
  activity: (id: string) => ['task', id, 'activity'] as const,
};

export const projectKeys = {
  all: ['projects'] as const,
  list: (query: string) => ['projects', query] as const,
  detail: (id: string) => ['project', id] as const,
};

export const activityKeys = {
  all: ['activity', 'feed'] as const,
  feed: (projectId?: string) => ['activity', 'feed', projectId ?? 'all'] as const,
  missed: ['activity', 'missed'] as const,
};

export const notificationKeys = {
  list: () => ['notifications'] as const,
};

export const userKeys = {
  list: (role?: string) => ['users', role ?? 'all'] as const,
};

export const accessRequestKeys = {
  all: ['access-requests'] as const,
  list: (status?: string) => ['access-requests', status ?? 'all'] as const,
  options: ['access-requests', 'options'] as const,
};

export const clientKeys = {
  list: () => ['clients'] as const,
};
