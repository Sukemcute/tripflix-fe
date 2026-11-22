import { vi } from '@tripflix/i18n';
import type { ReactNode } from 'react';

/** Trạng thái rỗng: chữ thuần, không hộp trang trí. Có thể kèm một hành động. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-5 text-text-muted">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const BAR_WIDTHS = ['w-3/4', 'w-full', 'w-5/6', 'w-2/3'] as const;

/** Khung chờ tải: các thanh tĩnh (không nhấp nháy), có nhãn cho trình đọc màn hình. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-4 py-4" aria-busy="true">
      <output className="sr-only">{vi.api.loading}</output>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`h-8 rounded-adm bg-surface-muted ${BAR_WIDTHS[index % BAR_WIDTHS.length]}`}
        />
      ))}
    </div>
  );
}
