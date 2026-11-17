'use client';
import { cn } from '@tripflix/ui-web';
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { Icon, type IconName } from './icon';

export type Tone = 'neutral' | 'teal' | 'sun' | 'coral' | 'danger' | 'navy';

const TONE_BADGE: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-text-muted ring-border',
  teal: 'bg-teal-soft text-teal-ink ring-teal/25',
  sun: 'bg-sun-soft text-ink ring-sun/40',
  coral: 'bg-coral-tint text-coral-ink ring-coral/25',
  danger: 'bg-danger/10 text-danger ring-danger/25',
  navy: 'bg-navy/5 text-navy ring-navy/15',
};

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-text-subtle',
  teal: 'bg-teal',
  sun: 'bg-sun',
  coral: 'bg-coral',
  danger: 'bg-danger',
  navy: 'bg-navy',
};

const TONE_ICON: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-text-muted',
  teal: 'bg-teal-soft text-teal-ink',
  sun: 'bg-sun-soft text-ink',
  coral: 'bg-coral-tint text-coral-ink',
  danger: 'bg-danger/10 text-danger',
  navy: 'bg-navy/5 text-navy',
};

export function Badge({
  tone = 'neutral',
  hasDot = false,
  className,
  children,
  ...props
}: { tone?: Tone; hasDot?: boolean } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONE_BADGE[tone],
        className,
      )}
      {...props}
    >
      {hasDot && <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusDot({ tone, isPulsing = false }: { tone: Tone; isPulsing?: boolean }) {
  return (
    <span className="relative inline-flex size-2.5" aria-hidden="true">
      {isPulsing && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', TONE_DOT[tone])} />}
      <span className={cn('relative inline-flex size-2.5 rounded-full', TONE_DOT[tone])} />
    </span>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-background hover:bg-ink',
  accent: 'bg-teal text-background hover:bg-teal-ink',
  secondary: 'border border-border bg-background text-text hover:bg-surface',
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
  danger: 'border border-danger/30 bg-background text-danger hover:bg-danger/10',
};

const BUTTON_SIZE = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
} as const;

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZE;
  icon?: IconName;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }) {
  return (
    <section
      className={cn('min-w-0 rounded-2xl border border-border bg-background shadow-sm', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  icon,
  action,
  className,
  titleId,
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <header className={cn('flex items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-navy">
            <Icon name={icon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-bold text-text">
            {title}
          </h2>
          {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
  isLoading = false,
  isHighlighted = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon: IconName;
  isLoading?: boolean;
  isHighlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 shadow-sm transition-colors',
        isHighlighted ? 'border-danger/40 ring-1 ring-danger/20' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-muted">{label}</span>
        <span className={cn('grid size-8 place-items-center rounded-lg', TONE_ICON[tone])}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <strong className="text-2xl font-bold tracking-tight text-text tabular-nums">{value}</strong>
      )}
      {sub && <span className="truncate text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-text md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  body,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full bg-surface-muted text-text-subtle">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="text-sm font-bold text-text">{title}</h3>
      {body && <p className="max-w-sm text-xs text-text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded-md bg-surface-muted', className)} aria-hidden="true" />;
}

export interface SegmentItem<T extends string> {
  id: T;
  label: string;
  /** Tên đọc cho trình đọc màn hình; mặc định là label (để số đếm không làm đổi tên nút). */
  name?: string;
  count?: number;
  tone?: Tone;
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  isDisabled = false,
  className,
}: {
  items: readonly SegmentItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn('m-0 flex max-w-full min-w-0 gap-1 overflow-x-auto rounded-xl border-0 bg-surface-muted p-1', className)}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            aria-label={item.name ?? item.label}
            disabled={isDisabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50',
              isActive ? 'bg-background text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-[10px] leading-4 font-bold tabular-nums',
                  item.tone === 'danger' ? 'bg-danger text-background' : 'bg-navy/10 text-navy',
                )}
              >
                {item.count > 999 ? '999+' : item.count}
              </span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}

export const fieldLabelClass = 'flex flex-col gap-1 text-xs font-semibold text-text-muted';
export const controlClass =
  'h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-text outline-none transition-colors placeholder:text-text-subtle focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:opacity-60';
export const tableClass = 'w-full border-collapse text-left text-sm';
export const thClass =
  'border-b border-border bg-surface px-4 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-text-muted uppercase';
export const tdClass = 'border-b border-border/70 px-4 py-3 align-top';

/**
 * Ngăn kéo bên phải dựng bằng <dialog>.showModal(): có sẵn khoá focus, Esc để đóng và vai trò dialog.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  closeLabel,
  footer,
  children,
  wide = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full border-l border-border bg-background p-0 text-text shadow-2xl backdrop:bg-overlay',
        wide ? 'max-w-3xl' : 'max-w-xl',
      )}
    >
      {isOpen && (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={closeLabel} icon="close" />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
