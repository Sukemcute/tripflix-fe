import { cn } from '@tripflix/ui-web';
import type { ReactNode } from 'react';

/**
 * Tone dùng chung cho mọi trạng thái trong Admin. Trạng thái luôn có chữ (không chỉ dựa màu);
 * màu chữ lấy từ token ink/ink-tint để đạt tương phản AA trên nền nhạt.
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'urgent';

const tones: Record<StatusTone, { box: string; dot?: string }> = {
  neutral: { box: 'bg-surface-muted text-ink', dot: 'bg-text-subtle' },
  info: { box: 'border border-border bg-background text-ink', dot: 'bg-navy' },
  success: { box: 'bg-sea-mist text-teal-ink', dot: 'bg-teal' },
  warning: { box: 'bg-sun-soft text-ink', dot: 'bg-sun' },
  danger: { box: 'bg-coral-tint text-coral-ink', dot: 'bg-danger' },
  urgent: { box: 'bg-coral-ink text-white' },
};

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  const style = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-adm-sm px-1.5 text-xs leading-none whitespace-nowrap',
        style.box,
        className,
      )}
    >
      {style.dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}
