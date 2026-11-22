import type { ReactNode } from 'react';

/**
 * Tiêu đề trang: một lớp duy nhất (thay breadcrumb + eyebrow + H1 + mô tả cũ).
 * Dính trên cùng khi cuộn; dưới 1024px nằm dưới thanh menu 48px.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="sticky top-12 z-20 border-b border-border bg-background lg:top-0">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="shrink-0 text-xl leading-7 font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="hidden min-w-0 truncate text-[13px] text-text-muted md:block" title={description}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
