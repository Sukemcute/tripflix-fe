import { t } from '@tripflix/i18n';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_DAYS_LIMIT = 7;
export const RELATIVE_CLOCK_INTERVAL_MS = 30_000;

const OTHER_YEAR_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FULL_DATETIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function parseDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Định dạng mốc thời gian theo kiểu Facebook (giờ máy người xem, tiếng Việt):
 * - Tương lai hoặc < 60s: "Vừa xong"
 * - < 60 phút: "N phút"
 * - < 24 giờ: "N giờ"
 * - < 7 ngày: "N ngày"
 * - Cùng năm: "19 thg 11"
 * - Khác năm: "19/11/2025"
 */
export function formatRelativeTime(value: Date | string, now: Date | number = Date.now()): string {
  const date = parseDate(value);
  if (!date) return '';

  const nowDate = typeof now === 'number' ? new Date(now) : now;
  const elapsedMs = nowDate.getTime() - date.getTime();
  if (elapsedMs < MINUTE_MS) {
    return t('api.relativeTimeJustNow');
  }
  if (elapsedMs < HOUR_MS) {
    return t('api.relativeTimeMinutes', { count: Math.floor(elapsedMs / MINUTE_MS) });
  }
  if (elapsedMs < DAY_MS) {
    return t('api.relativeTimeHours', { count: Math.floor(elapsedMs / HOUR_MS) });
  }
  if (elapsedMs < RELATIVE_DAYS_LIMIT * DAY_MS) {
    return t('api.relativeTimeDays', { count: Math.floor(elapsedMs / DAY_MS) });
  }
  if (date.getFullYear() === nowDate.getFullYear()) {
    return t('api.relativeTimeSameYear', {
      day: date.getDate(),
      month: date.getMonth() + 1,
    });
  }
  return OTHER_YEAR_FORMATTER.format(date);
}

/** Ngày giờ đầy đủ theo giờ máy người xem để hiện tooltip khi rê chuột vào `<time>`. */
export function formatFullDateTime(value: Date | string): string {
  const date = parseDate(value);
  return date ? FULL_DATETIME_FORMATTER.format(date) : '';
}

/** Ngày tuyệt đối cố định theo UTC dùng cho lần render SSR/hydrate trước khi đổi sang giờ tương đối. */
export function formatAbsoluteUtcDate(value: Date | string): string {
  const date = parseDate(value);
  return date ? UTC_DATE_FORMATTER.format(date) : '';
}

// Một bộ đếm dùng chung cho toàn bộ bình luận và thẻ bài viết trên trang (tránh mỗi dòng tạo timer riêng).
const clockListeners = new Set<() => void>();
let clockNowMs: number | null = null;
let clockIntervalId: ReturnType<typeof setInterval> | null = null;
let hasVisibilityListener = false;

function notifyClockListeners() {
  clockNowMs = Date.now();
  for (const listener of clockListeners) {
    listener();
  }
}

function startClockTimer() {
  if (clockIntervalId !== null) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  clockIntervalId = setInterval(notifyClockListeners, RELATIVE_CLOCK_INTERVAL_MS);
}

function stopClockTimer() {
  if (clockIntervalId === null) return;
  clearInterval(clockIntervalId);
  clockIntervalId = null;
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'visible') {
    notifyClockListeners();
    startClockTimer();
  } else {
    stopClockTimer();
  }
}

export function subscribeRelativeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    clockNowMs = Date.now();
    startClockTimer();
    if (typeof document !== 'undefined' && !hasVisibilityListener) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      hasVisibilityListener = true;
    }
  }

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      stopClockTimer();
      if (typeof document !== 'undefined' && hasVisibilityListener) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        hasVisibilityListener = false;
      }
      clockNowMs = null;
    }
  };
}

export function getRelativeClockSnapshot(): number {
  if (clockNowMs === null) {
    clockNowMs = Date.now();
  }
  return clockNowMs;
}

export function getServerRelativeClockSnapshot(): null {
  return null;
}

/** Chỉ phục vụ test đơn vị kiểm tra đúng 1 timer và dọn dẹp sạch khi unmount hết. */
export function getRelativeClockListenerCount(): number {
  return clockListeners.size;
}
