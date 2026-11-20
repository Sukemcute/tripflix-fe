'use client';

import { vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AdminButton } from './button';
import { CloseIcon } from './icons';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' } as const;

/**
 * Hộp thoại giữa màn hình cho xác nhận và form ngắn (chi tiết hồ sơ dùng drawer, không dùng hộp này).
 * Dựa trên <dialog> native: khoá nền, bẫy focus, Esc đóng, trả focus về nút đã mở.
 * Đang xử lý (`isPending`) thì không cho đóng để tránh bỏ dở thao tác.
 */
export function AdminDialog({
  title,
  description,
  children,
  footer,
  onClose,
  isPending = false,
  size = 'md',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  isPending?: boolean;
  size?: keyof typeof SIZES;
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
      // closedby="any": bấm ra nền cũng đóng (trình duyệt hỗ trợ); cancel được chặn khi đang xử lý.
      {...{ closedby: isPending ? 'none' : 'any' }}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      className={cn(
        'adm-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] overflow-y-auto rounded-adm-lg',
        'border border-border bg-background p-0 text-ink shadow-adm-float',
        SIZES[size],
      )}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm leading-6 font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>}
        </div>
        <AdminButton
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-2"
          aria-label={vi.adminOperations.done}
          disabled={isPending}
          onClick={onClose}
        >
          <CloseIcon />
        </AdminButton>
      </header>
      <div className="px-5 pb-4">{children}</div>
      {footer && <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>}
    </dialog>
  );
}

/** Xác nhận một thao tác: nút xác nhận là nút chính, hoặc nút nguy hiểm khi `tone="danger"`. */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel,
  tone = 'primary',
  isPending = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AdminDialog
      title={title}
      description={description}
      onClose={onClose}
      isPending={isPending}
      size="sm"
      footer={
        <>
          <AdminButton disabled={isPending} onClick={onClose}>
            {vi.adminOperations.cancel}
          </AdminButton>
          <AdminButton variant={tone === 'danger' ? 'danger' : 'primary'} disabled={isPending} onClick={onConfirm}>
            {isPending ? vi.adminOperations.saving : confirmLabel}
          </AdminButton>
        </>
      }
    >
      {children}
    </AdminDialog>
  );
}
