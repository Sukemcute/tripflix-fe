import { t } from '@tripflix/i18n';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** Quá số ngày này thì hiện ngày cụ thể thay cho "x ngày trước". */
const RELATIVE_DAYS_LIMIT = 7;

/**
 * Ngày đăng gọn cho thẻ kết quả: gần đây thì "x phút/giờ/ngày trước"; trong năm nay thì "12/7";
 * năm khác thì "11/10/2025".
 */
export function formatSearchCardDate(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const elapsedMs = Math.max(0, now.getTime() - date.getTime());
  if (elapsedMs < MINUTE_MS) return t('api.timeJustNow');
  if (elapsedMs < HOUR_MS) return t('api.timeMinutesAgo', { count: Math.floor(elapsedMs / MINUTE_MS) });
  if (elapsedMs < DAY_MS) return t('api.timeHoursAgo', { count: Math.floor(elapsedMs / HOUR_MS) });
  if (elapsedMs < RELATIVE_DAYS_LIMIT * DAY_MS) return t('api.timeDaysAgo', { count: Math.floor(elapsedMs / DAY_MS) });
  const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;
  return date.getFullYear() === now.getFullYear() ? dayMonth : `${dayMonth}/${date.getFullYear()}`;
}

/** Dòng caption của thẻ: tiêu đề, thiếu thì dòng đầu nội dung; hashtag hiện riêng để tô màu. */
export function getSearchCardCaption(post: Pick<SocialPostDto, 'title' | 'body' | 'hashtags'>): {
  text: string;
  tags: string[];
} {
  const text = post.title.trim() || (post.body.split('\n').find((line) => line.trim()) ?? '').trim();
  const tags = post.hashtags.map((tag) => tag.replace(/^#/u, '').trim()).filter(Boolean);
  return { text, tags };
}
