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
  <span className="relative inline-flex shrink-0">
    <span
      className={clsx(
        'inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent',
        className,
      )}
    >
      {initials(name)}
    </span>
    {online === undefined ? null : (
      <span
        className={clsx(
          'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface',
          online ? 'bg-success' : 'bg-line-strong',
        )}
        title={online ? 'Online' : 'Offline'}
      />
    )}
  </span>
);

export const AvatarStack = ({ names, max = 4 }: { names: string[]; max?: number }) => {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;

  return (
    <span className="flex items-center">
      {shown.map((name, index) => (
        <span key={name + index} className={index === 0 ? '' : '-ml-2'}>
          <Avatar name={name} className="size-7 text-[10px] ring-2 ring-surface" />
        </span>
      ))}
      {extra > 0 ? (
        <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted ring-2 ring-surface">
          +{extra}
        </span>
      ) : null}
    </span>
  );
};
