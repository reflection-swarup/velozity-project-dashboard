import clsx from 'clsx';
import { initials } from '../../lib/format';

export const Avatar = ({
  name,
  online,
  className,
}: {
  name: string;
  online?: boolean;
  className?: string;
}) => (
  <span className="relative inline-flex">
    <span
      className={clsx(
        'inline-flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700',
        className,
      )}
    >
      {initials(name)}
    </span>
    {online === undefined ? null : (
      <span
        className={clsx(
          'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-white',
          online ? 'bg-emerald-500' : 'bg-slate-300',
        )}
        title={online ? 'Online' : 'Offline'}
      />
    )}
  </span>
);
