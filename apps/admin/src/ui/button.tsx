import { cn } from '@tripflix/ui-web';
import type { ButtonHTMLAttributes } from 'react';

const variants = {
  // Nút chính: tối đa một nút mỗi vùng. Nền ink (trung tính) để không lẫn với nút nguy hiểm màu coral.
  primary: 'bg-ink text-white font-semibold hover:bg-ink/90',
  secondary: 'border border-border bg-background text-ink hover:bg-surface-muted',
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-ink',
  danger: 'border border-border bg-background text-coral-ink hover:bg-coral-tint',
} as const;

const sizes = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  md: 'h-8 gap-2 px-3 text-[13px]',
  lg: 'h-9 gap-2 px-4 text-sm',
  icon: 'h-8 w-8',
} as const;

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function AdminButton({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-adm whitespace-nowrap',
        'transition-[color,background-color,border-color,opacity,transform] duration-150 ease-adm',
        'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-ink',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
