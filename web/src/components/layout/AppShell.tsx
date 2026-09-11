import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { IconChevronRight } from '../ui/Icon';

export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}) => (
  <div className="mb-5">
    {breadcrumbs && breadcrumbs.length > 0 ? (
      <nav className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.label} className="flex items-center gap-1">
            {index > 0 ? <IconChevronRight className="size-3.5 text-subtle" /> : null}
            {crumb.to ? (
              <Link to={crumb.to} className="transition-colors hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    ) : null}

    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1.5 text-md text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>

    {tabs ? <div className="mt-4 border-b border-line">{tabs}</div> : null}
  </div>
);

// One level above a Card: an eyebrow label and a rule that group related cards
// together, so a long dashboard reads as a few sections rather than a wall of
// identical boxes.
export const Section = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mt-9 first:mt-0">
    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2.5">
      <div>
        <h2 className="text-xs font-bold tracking-[0.12em] text-subtle uppercase">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const AppShell = () => {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-[17.5rem] shrink-0 border-r border-line lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-fade absolute inset-y-0 left-0 w-[18rem] border-r border-line shadow-2xl">
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
