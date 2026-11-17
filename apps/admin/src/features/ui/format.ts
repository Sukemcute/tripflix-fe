import { t } from '@tripflix/i18n';

const numberFormat = new Intl.NumberFormat('vi-VN');
const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatDateTime(value: string | number | Date): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatClock(value: string | number | Date): string {
  return timeFormat.format(new Date(value));
}

/** "3 phút trước". Thời điểm trong tương lai (đồng hồ lệch) coi như vừa xong. */
export function formatRelative(value: string | number | Date, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return t('adminConsole.time.justNow');
  if (seconds < 60) return t('adminConsole.time.secondsAgo', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('adminConsole.time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('adminConsole.time.hoursAgo', { count: hours });
  return t('adminConsole.time.daysAgo', { count: Math.floor(hours / 24) });
}

/** Mã rút gọn cho id dài (uuid): đủ để đối chiếu, không chiếm chỗ. */
export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—';
}
