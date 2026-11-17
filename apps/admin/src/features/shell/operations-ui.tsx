import type { ReactNode } from 'react';
import { vi } from '@tripflix/i18n';

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
    <section className="min-w-0 overflow-hidden rounded-xl border border-text-subtle/40 bg-background shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface-muted px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-5 w-1 shrink-0 rounded-full bg-teal" aria-hidden="true" />
          <h2 className="text-sm font-bold text-navy">{title}</h2>
          {description && <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>}
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
    <article
      className={`min-w-0 rounded-xl border border-t-4 border-text-subtle/40 bg-background p-5 shadow-sm ${urgent && value ? 'border-t-danger' : 'border-t-teal'}`}
    >
      <p className="text-sm font-semibold text-text-muted">{label}</p>
      <strong
        className={`mt-3 block text-4xl font-bold tracking-tight tabular-nums ${urgent && value ? 'text-danger' : 'text-navy'}`}
      >
        {value === undefined ? '—' : value.toLocaleString('vi-VN')}
      </strong>
      {hint && <p className="mt-2 text-xs text-text-muted">{hint}</p>}
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
  return (
    <div className="px-6 py-12 text-center">
      <span
        className="mx-auto mb-3 block h-7 w-7 rounded-lg border border-border bg-surface-muted"
        aria-hidden="true"
      />
      <h3 className="text-sm font-bold">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-text-muted">{description}</p>
      )}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-4 p-5" aria-busy="true">
      <output className="sr-only">{vi.api.loading}</output>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-12 rounded-md bg-surface-muted motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
