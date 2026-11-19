import { useEffect, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, title, description, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="rise w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-lg font-semibold text-slate-950">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
