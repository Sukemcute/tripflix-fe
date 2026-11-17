'use client';
import { t, vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import { formatRelative } from '../ui/format';
import { StatusDot, type Tone } from '../ui/primitives';
import { useNow } from '../ui/use-now';
import { useStaffLive } from './staff-live';

const STATUS_TONE: Record<string, Tone> = { live: 'teal', connecting: 'sun', offline: 'danger', idle: 'neutral' };

/** Trạng thái kết nối realtime; <output> để trình đọc màn hình báo khi đổi. */
export function LiveIndicator({ className }: { className?: string }) {
  const { status, feed, stats } = useStaffLive();
  const now = useNow();
  const last = feed[0]?.at ?? stats.data?.generatedAt;
  return (
    <output
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text',
        className,
      )}
      title={vi.adminConsole.live.liveHint}
    >
      <StatusDot tone={STATUS_TONE[status] ?? 'neutral'} isPulsing={status === 'live'} />
      <span>{vi.adminConsole.live[status]}</span>
      {last && (
        <span className="hidden font-normal text-text-muted sm:inline">
          · {t('adminConsole.live.updatedAt', { time: formatRelative(last, now) })}
        </span>
      )}
    </output>
  );
}
