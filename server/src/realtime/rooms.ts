export const rooms = {
  global: 'feed:global',
  project: (projectId: string) => `feed:project:${projectId}`,
  user: (userId: string) => `user:${userId}`,
};
