import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../auth/AuthProvider';
import { useSocket } from '../../realtime/SocketProvider';
import { ROLE_LABELS } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { NotificationBell } from './NotificationBell';
import type { Role } from '../../types';

type NavItem = { to: string; label: string; roles: Role[] };

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'] },
  { to: '/projects', label: 'Projects', roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'] },
  { to: '/tasks', label: 'Tasks', roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'] },
  { to: '/activity', label: 'Activity', roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'] },
  { to: '/clients', label: 'Clients', roles: ['ADMIN'] },
  { to: '/users', label: 'Team', roles: ['ADMIN'] },
];

const ConnectionDot = () => {
  const { connected } = useSocket();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span
        className={clsx('size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-500')}
        title={connected ? 'Live updates connected' : 'Reconnecting'}
      />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
};

export const AppShell = () => {
  const { user, logout } = useAuth();
  const { presence } = useSocket();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              V
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">Velozity</p>
              <p className="text-xs leading-tight text-slate-500">Project Dashboard</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ConnectionDot />
            {user.role === 'ADMIN' ? (
              <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                <span className="size-2 rounded-full bg-emerald-500" />
                {presence.onlineCount} online
              </span>
            ) : null}
            <NotificationBell />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-100"
              >
                <Avatar name={user.name} />
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-medium leading-tight">{user.name}</span>
                  <span className="block text-xs leading-tight text-slate-500">
                    {ROLE_LABELS[user.role]}
                  </span>
                </span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white p-3 shadow-lg ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-900">{user.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                  <p className="mt-2 text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => void logout()}
                  >
                    Sign out
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition',
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};
