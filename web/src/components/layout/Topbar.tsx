import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../auth/AuthProvider';
import { useSocket } from '../../realtime/SocketProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { ROLE_LABELS } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { IconLogout, IconMenu, IconMoon, IconSearch, IconSun } from '../ui/Icon';
import { NotificationBell } from './NotificationBell';

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      className="relative hidden flex-1 sm:block sm:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        navigate(query ? `/tasks?search=${encodeURIComponent(query)}` : '/tasks');
      }}
    >
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-subtle" />
      <input
        ref={input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search tasks"
        aria-label="Search tasks"
        className="h-10 w-full rounded-lg bg-raised pr-16 pl-10 text-md text-ink ring-1 ring-transparent transition-shadow duration-150 placeholder:text-subtle focus:bg-surface focus:ring-accent"
      />
      <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[11px] font-semibold text-subtle">
        ⌘K
      </kbd>
    </form>
  );
};

const ThemeToggle = () => {
  const { resolved, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg p-2 text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
      aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={resolved === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      {resolved === 'dark' ? <IconSun className="size-5" /> : <IconMoon className="size-5" />}
    </button>
  );
};

const PresenceChip = () => {
  const { connected, presence } = useSocket();
  const { user } = useAuth();

  return (
    <span
      className="hidden items-center gap-2 rounded-lg bg-raised px-3 py-2 text-[13px] font-medium text-muted md:inline-flex"
      title={connected ? 'Live updates connected' : 'Reconnecting to live updates'}
    >
      <span className={clsx('size-2 rounded-full', connected ? 'bg-success' : 'bg-warn')} />
      {user?.role === 'ADMIN' && connected ? `${presence.onlineCount} online` : connected ? 'Live' : 'Reconnecting'}
    </span>
  );
};

const UserMenu = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg p-1 transition-colors duration-150 hover:bg-raised"
        aria-label="Account menu"
      >
        <Avatar name={user.name} />
        <span className="hidden text-left lg:block">
          <span className="block text-sm font-semibold text-ink">{user.name}</span>
          <span className="block text-xs text-muted">{user.email}</span>
        </span>
      </button>

      {open ? (
        <div className="animate-fade absolute right-0 z-40 mt-2 w-60 rounded-xl bg-surface p-3 shadow-xl ring-1 ring-line">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-md font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-md font-semibold text-ink">
            Signed in as {ROLE_LABELS[user.role]}
          </p>
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => void logout()}>
            <IconLogout className="size-3.5" />
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export const Topbar = ({ onOpenNav }: { onOpenNav: () => void }) => (
  <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-5">
    <button
      type="button"
      onClick={onOpenNav}
      className="rounded-lg p-2 text-muted hover:bg-raised lg:hidden"
      aria-label="Open navigation"
    >
      <IconMenu className="size-5" />
    </button>

    <GlobalSearch />

    <div className="ml-auto flex items-center gap-1 sm:gap-2">
      <PresenceChip />
      <ThemeToggle />
      <NotificationBell />
      <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
      <UserMenu />
    </div>
  </header>
);
