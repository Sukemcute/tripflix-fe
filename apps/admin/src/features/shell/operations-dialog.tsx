'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { vi } from '@tripflix/i18n';

export function OperationsDialog({
  title,
  children,
  onClose,
  isPending = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  isPending?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      className="ops-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-0 text-ink"
    >
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <h2 id={titleId} className="text-base font-bold">
          {title}
        </h2>
        <button
          className="rounded px-2 py-1 text-text-muted hover:bg-surface-muted"
          aria-label={vi.adminOperations.done}
          disabled={isPending}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
