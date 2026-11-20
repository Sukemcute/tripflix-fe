'use client';

import { vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { AdminButton } from './button';
import { ChevronDownIcon, SearchMonitorIcon } from './icons';

const control =
  'adm-control h-8 rounded-adm border bg-background text-[13px] text-ink transition-colors duration-150 ease-adm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-ink motion-reduce:transition-none';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Ô tìm kiếm: tự gửi giá trị sau 300ms ngừng gõ (hoặc Enter), không cần nút "Tìm".
 * `value` là giá trị đang áp dụng (thường lấy từ URL); đổi từ ngoài (xoá bộ lọc) thì ô cập nhật theo.
 */
export function SearchField({
  value,
  onChange,
  label,
  placeholder = vi.adminOperations.table.searchPlaceholder,
  maxLength = 200,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => {
      onChange(draft.trim());
      setDraft(null);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, onChange]);
  return (
    <div className={cn('relative w-full max-w-72', className)}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted">
        <SearchMonitorIcon width={14} height={14} />
      </span>
      <input
        type="search"
        aria-label={label}
        value={shown}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          onChange(shown.trim());
          setDraft(null);
        }}
        className={cn(control, 'w-full border-border pr-2.5 pl-8 placeholder:text-text-muted')}
      />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Ô chọn gọn (32px). Nhãn nằm ở aria-label; lựa chọn "tất cả" là giá trị rỗng. Có lựa chọn "tất cả" mà đang chọn giá trị khác thì viền teal (đang lọc). */
export function SelectField({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  /** Nhãn của lựa chọn không lọc (giá trị rỗng); bỏ qua nếu không có lựa chọn này. */
  allLabel?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="relative">
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(control, 'appearance-none pr-7 pl-2.5', allLabel !== undefined && value ? 'border-teal-ink' : 'border-border')}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-muted">
        <ChevronDownIcon width={14} height={14} />
      </span>
    </div>
  );
}

/**
 * Một hàng công cụ lọc: các ô điều khiển bên trái; bên phải là tóm tắt kết quả và "Xoá bộ lọc" (chỉ khi có lọc).
 * Không dùng khung/thẻ để tiết kiệm chiều cao.
 */
export function FilterToolbar({
  children,
  summary,
  hasActiveFilters = false,
  onReset,
  actions,
}: {
  children: ReactNode;
  summary?: ReactNode;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  actions?: ReactNode;
}) {
  return (
    <search className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
        {hasActiveFilters && onReset && (
          <AdminButton variant="ghost" size="sm" onClick={onReset}>
            {vi.adminOperations.table.resetFilters}
          </AdminButton>
        )}
      </div>
      {summary && (
        <output className="text-xs text-text-muted tabular-nums" aria-live="polite">
          {summary}
        </output>
      )}
      {actions}
    </search>
  );
}
