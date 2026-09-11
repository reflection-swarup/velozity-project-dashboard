import { useEffect } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const Modal = ({ open, title, onClose, children, footer }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl ring-1 ring-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
};
