'use client';

import { cn } from '@tripflix/ui-web';

export interface SegmentedOption<Id extends string> {
  id: Id;
  label: string;
  count?: number;
}

/** Nhóm nút chọn một trong vài trạng thái (ví dụ Chờ duyệt / Đã duyệt / Đã ẩn). Dùng aria-pressed trên từng nút. */
export function Segmented<Id extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly SegmentedOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="m-0 inline-flex h-8 min-w-0 rounded-adm border border-border p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-adm-sm px-2.5 text-[13px] whitespace-nowrap',
              'transition-colors duration-150 ease-adm motion-reduce:transition-none disabled:opacity-50',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-ink',
              isActive ? 'bg-surface-muted text-ink' : 'text-text-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="text-xs tabular-nums">{option.count}</span>}
          </button>
        );
      })}
    </fieldset>
  );
}
