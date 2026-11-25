const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_DAYS_LIMIT = 7;

export type RelativeTimeParts =
  | { unit: 'justNow' }
  | { unit: 'minutes' | 'hours' | 'days'; count: number }
  | { unit: 'sameYear'; day: number; month: number }
  | { unit: 'otherYear'; day: number; month: number; year: number };

/**
 * Mốc thời gian của bình luận theo kiểu mạng xã hội: "Vừa xong", "5 phút", "3 giờ", "2 ngày",
 * quá 7 ngày thì hiện ngày. Trả về phần số để màn hình tự ghép chữ từ i18n.
 */
export function getRelativeTimeParts(value: string, now: number): RelativeTimeParts | null {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const elapsedMs = now - time;
  if (elapsedMs < MINUTE_MS) return { unit: 'justNow' };
  if (elapsedMs < HOUR_MS) return { unit: 'minutes', count: Math.floor(elapsedMs / MINUTE_MS) };
  if (elapsedMs < DAY_MS) return { unit: 'hours', count: Math.floor(elapsedMs / HOUR_MS) };
  if (elapsedMs < RELATIVE_DAYS_LIMIT * DAY_MS)
    return { unit: 'days', count: Math.floor(elapsedMs / DAY_MS) };
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if (date.getFullYear() === new Date(now).getFullYear()) return { unit: 'sameYear', day, month };
  return { unit: 'otherYear', day, month, year: date.getFullYear() };
}

/** Chọn ổn định một tông màu avatar theo mã người dùng: cùng người luôn cùng màu, người khác dễ phân biệt. */
export function pickAvatarTone(authorId: string, toneCount: number): number {
  if (toneCount <= 0) return 0;
  let hash = 0;
  for (const char of authorId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % toneCount;
}
