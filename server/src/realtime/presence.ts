const sockets = new Map<string, Set<string>>();

export const presence = {
  add(userId: string, socketId: string) {
    const existing = sockets.get(userId);
    if (existing) {
      existing.add(socketId);
      return false;
    }
    sockets.set(userId, new Set([socketId]));
    return true;
  },

  remove(userId: string, socketId: string) {
    const existing = sockets.get(userId);
    if (!existing) return false;
    existing.delete(socketId);
    if (existing.size > 0) return false;
    sockets.delete(userId);
    return true;
  },

  onlineUserIds: () => [...sockets.keys()],
  count: () => sockets.size,
  isOnline: (userId: string) => sockets.has(userId),
};
