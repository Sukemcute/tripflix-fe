'use client';

import { cn } from '@tripflix/ui-web';
import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

/** Ô nhập một dòng có nhãn phía trên (12px) và gợi ý/lỗi bên dưới; nhãn gắn đúng với ô nhập qua htmlFor. */
export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs text-text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn(
          'adm-control h-9 w-full rounded-adm border bg-background px-3 text-[13px] text-ink',
          'transition-colors duration-150 ease-adm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-ink',
          'disabled:opacity-50 motion-reduce:transition-none',
          error ? 'border-coral-ink' : 'border-border',
          className,
        )}
        {...props}
      />
      {note && (
        <p id={noteId} className={cn('text-xs', error ? 'text-coral-ink' : 'text-text-muted')}>
          {note}
        </p>
      )}
    </div>
  );
}

/** Ô chọn có nhãn phía trên, cùng kích thước với TextField (dùng trong biểu mẫu; thanh lọc dùng SelectField). */
export function SelectInput({
  label,
  className,
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & { label: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs text-text-muted">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          'adm-control h-9 w-full rounded-adm border border-border bg-background px-3 text-[13px] text-ink',
          'transition-colors duration-150 ease-adm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-ink',
          'disabled:opacity-50 motion-reduce:transition-none',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
