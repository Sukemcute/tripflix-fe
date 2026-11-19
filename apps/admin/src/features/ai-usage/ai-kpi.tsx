/**
 * Thẻ số liệu nhận chuỗi (chi phí USD, "tokens vào / ra"). `Metric` của shell chỉ nhận số nên làm riêng ở đây
 * thay vì sửa component dùng chung; cùng kiểu viền và bóng với Metric.
 */
export function AiKpi({ label, value, hint }: { label: string; value: string | undefined; hint?: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-t-4 border-text-subtle/40 border-t-teal bg-background p-5 shadow-sm">
      <p className="text-sm font-semibold text-text-muted">{label}</p>
      <strong
        className={`mt-3 block whitespace-nowrap font-bold tracking-tight tabular-nums text-navy ${
          (value?.length ?? 0) > 12 ? 'text-xl leading-9' : (value?.length ?? 0) > 8 ? 'text-2xl leading-9' : 'text-3xl'
        }`}
        title={value}
      >
        {value ?? '—'}
      </strong>
      {hint && <p className="mt-2 text-xs text-text-muted">{hint}</p>}
    </article>
  );
}
