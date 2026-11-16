/** Khoảng cách thời gian để hiện kiểu "5 phút trước"; quá hôm qua thì hiện ngày. */
export type NotificationAge =
  | { kind: 'justNow' }
  | { kind: 'minutes' | 'hours'; count: number }
  | { kind: 'yesterday' }
  | { kind: 'date' };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getNotificationAge(createdAt: Date, now: Date): NotificationAge {
  const elapsedMs = now.getTime() - createdAt.getTime();
  // Đồng hồ máy lệch làm thời điểm ở tương lai thì coi như vừa xong.
  if (elapsedMs < MINUTE_MS) return { kind: 'justNow' };
  if (elapsedMs < HOUR_MS) return { kind: 'minutes', count: Math.floor(elapsedMs / MINUTE_MS) };
  if (isSameLocalDay(createdAt, now)) return { kind: 'hours', count: Math.floor(elapsedMs / HOUR_MS) };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameLocalDay(createdAt, yesterday) ? { kind: 'yesterday' } : { kind: 'date' };
}

/** Chữ trên huy hiệu: ẩn khi 0, quá 9 thì "9+" để huy hiệu không phình. */
export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}
