'use client';
import type { ReactNode } from 'react';
import { AdminDialog } from '@/ui/dialog';

/**
 * Giữ tên và props cũ để các màn chưa chuyển vẫn chạy; giao diện và hành vi (native dialog, Esc, khoá khi đang xử lý)
 * nay do AdminDialog đảm nhiệm. Màn mới nên dùng thẳng AdminDialog hoặc ConfirmDialog.
 */
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
  return (
    <AdminDialog title={title} onClose={onClose} isPending={isPending}>
      {children}
    </AdminDialog>
  );
}
