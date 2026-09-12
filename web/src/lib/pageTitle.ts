import type { Role } from '../types';

const SECTIONS: Record<string, string> = {
  dashboard: 'Overview',
  projects: 'Projects',
  tasks: 'Tasks',
  activity: 'Activity',
  clients: 'Clients',
  users: 'Team',
};

// Every tab used to read "Velozity Dashboard", which is unhelpful when the same
// browser has two or three sessions open as different people. Naming the signed
// in user makes them tellable apart from the tab strip alone.
export const pageTitle = (pathname: string, name?: string, role?: Role) => {
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const section = SECTIONS[segment];

  if (!section) return 'Velozity Dashboard';

  const label = segment === 'tasks' && role === 'DEVELOPER' ? 'My Tasks' : section;
  return name ? `${label} · ${name}` : label;
};
