import type { ReactNode } from 'react';

/** Một mục trong thân drawer: tiêu đề + nội dung, ngăn với mục trước bằng đường kẻ (không bọc trong thẻ). */
export function DetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-border pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  /** Giá trị dạng mã (ID, token): chữ đơn cách, cho phép ngắt dòng. */
  isCode?: boolean;
}

/** Danh sách nhãn – giá trị hai cột; giá trị trống hiện "—". */
export function KeyValueList({ items }: { items: readonly KeyValueItem[] }) {
  return (
    <dl className="grid grid-cols-[minmax(96px,160px)_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-text-muted">{item.label}</dt>
          <dd className={item.isCode ? 'font-mono text-xs break-all' : 'break-words'}>
            {item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
