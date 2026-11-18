'use client';
import { vi } from '@tripflix/i18n';
import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Cửa sổ chi tiết hành vi một người dùng. Cùng cách làm với OperationsDialog (shell) nhưng rộng hơn
 * để đủ chỗ cho bảng hoạt động; không sửa component dùng chung của shell.
 */
export function UserActivityDialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
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
        onClose();
      }}
      onClick={(event) => {
        // Bấm ra ngoài khung (vào nền mờ) thì đóng.
        if (event.target === event.currentTarget) onClose();
      }}
      className="ops-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-0 text-ink shadow-sm"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface-muted px-6 py-5">
        <div>
          <h2 id={titleId} className="text-base font-bold text-navy">
            {title}
          </h2>
          {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
        </div>
        <button
          type="button"
          className="rounded px-2 py-1 text-text-muted hover:bg-surface"
          aria-label={vi.adminOperations.done}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
