'use client';

import { cn } from '@tripflix/ui-web';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

export interface MetricItem {
  id: string;
  label: string;
  /** undefined = chưa có dữ liệu (đang tải hoặc lỗi), hiển thị "—". */
  value: number | string | undefined;
  hint?: ReactNode;
  /** Số lớn hơn 0 thì tô màu cảnh báo. */
  isUrgent?: boolean;
  /** Có href: cả ô là liên kết. Có onClick: cả ô là nút lọc (dùng aria-pressed). */
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

const cell = 'min-w-0 px-4 py-3 text-left';

function Content({ item }: { item: MetricItem }) {
  const hasValue = item.value !== undefined;
  const isUrgent = item.isUrgent && Number(item.value) > 0;
  return (
    <>
      <span className="block truncate text-xs text-text-muted">{item.label}</span>
      <span
        className={cn(
          'mt-1 block text-2xl leading-8 font-semibold tabular-nums',
          isUrgent && 'text-coral-ink',
        )}
      >
        {hasValue
          ? typeof item.value === 'number'
            ? item.value.toLocaleString('vi-VN')
            : item.value
          : '—'}
      </span>
      {item.hint && <span className="mt-0.5 block truncate text-xs text-text-muted">{item.hint}</span>}
    </>
  );
}

/**
 * Dải số liệu: một hàng, chia bằng vạch dọc (không thẻ rời). Mỗi ô có thể là liên kết hoặc nút lọc,
 * vì số liệu chỉ có giá trị khi dẫn tới hành động.
 */
export function MetricStrip({ label, items }: { label: string; items: readonly MetricItem[] }) {
  const style = { '--cols': Math.min(items.length, 6) } as CSSProperties;
  return (
    <section
      aria-label={label}
      style={style}
      className="grid grid-cols-2 divide-x divide-border border-y border-border max-sm:[&>*:nth-child(n+3)]:border-t max-sm:[&>*:nth-child(n+3)]:border-border max-sm:[&>*:nth-child(odd)]:border-l-0 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
    >
      {items.map((item) => {
        const interactive = cn(
          cell,
          'block transition-colors duration-150 ease-adm hover:bg-surface motion-reduce:transition-none',
          item.isActive && 'bg-surface shadow-[inset_0_-2px_0_var(--color-teal)]',
        );
        if (item.href)
          return (
            <Link key={item.id} href={item.href} className={interactive}>
              <Content item={item} />
            </Link>
          );
        if (item.onClick)
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.isActive ?? false}
              onClick={item.onClick}
              className={interactive}
            >
              <Content item={item} />
            </button>
          );
        return (
          <div key={item.id} className={cell}>
            <Content item={item} />
          </div>
        );
      })}
    </section>
  );
}
