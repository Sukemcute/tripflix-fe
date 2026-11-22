'use client';

import { useSyncExternalStore } from 'react';
import {
  formatAbsoluteUtcDate,
  formatFullDateTime,
  formatRelativeTime,
  getRelativeClockSnapshot,
  getServerRelativeClockSnapshot,
  subscribeRelativeClock,
} from './relative-time';

/**
 * Hiển thị mốc thời gian dạng `<time dateTime>` tự cập nhật qua một đồng hồ chung.
 * SSR và lượt hydrate đầu dùng ngày UTC cố định (tránh lệch múi giờ/đồng hồ server-client),
 * sau mount tự chuyển sang thời gian tương đối kiểu Facebook và kèm tooltip ngày giờ đầy đủ.
 */
export function RelativeTime({
  value,
  now,
  className,
}: {
  value: string;
  now?: Date;
  className?: string;
}) {
  const clientNowMs = useSyncExternalStore(
    subscribeRelativeClock,
    getRelativeClockSnapshot,
    getServerRelativeClockSnapshot,
  );

  const effectiveNow = now ?? clientNowMs;
  const label = effectiveNow !== null ? formatRelativeTime(value, effectiveNow) : formatAbsoluteUtcDate(value);
  const fullDateTime = effectiveNow !== null ? formatFullDateTime(value) : undefined;

  return (
    <time dateTime={value} title={fullDateTime || undefined} className={className}>
      {label}
    </time>
  );
}
