import type { ReactNode } from 'react';
import { vi } from '@tripflix/i18n';
import { EmptyState as AdminEmptyState, LoadingState as AdminLoadingState } from '@/ui/states';

/**
 * Tên export cũ được giữ để các trang chưa chuyển vẫn chạy; bên trong đã dùng giao diện phẳng mới
 * (viền mảnh, không đổ bóng, không thanh màu). Trang mới dùng thẳng thành phần trong src/ui.
 */
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-adm-lg border border-border bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm leading-5 font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] leading-5 text-text-muted">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  hint,
  urgent = false,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  urgent?: boolean;
}) {
  return (
    <article className="min-w-0 rounded-adm-lg border border-border bg-background p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <strong
        className={`mt-1 block text-2xl leading-8 font-semibold tabular-nums ${urgent && value ? 'text-coral-ink' : ''}`}
      >
        {value === undefined ? '—' : value.toLocaleString('vi-VN')}
      </strong>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </article>
  );
}

export function EmptyState({
  title = vi.adminOperations.empty,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return <AdminEmptyState title={title} description={description} />;
}

export function LoadingState() {
  return <AdminLoadingState />;
}
