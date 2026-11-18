import { t, vi } from '@tripflix/i18n';

const copy = vi.userActivity;
const DAY_MS = 86_400_000;

export const USER_ACTIVITY_RANGES = [1, 7, 30, 90] as const;
export type UserActivityRangeDays = (typeof USER_ACTIVITY_RANGES)[number];

// Ngày theo giờ Việt Nam, khớp cách API tính ngày.
const vnDate = (at: number) => new Date(at + 7 * 3_600_000).toISOString().slice(0, 10);

/** `days` ngày tính tới hôm nay (gồm hôm nay), dạng YYYY-MM-DD mà API nhận. */
export function userActivityRange(days: UserActivityRangeDays, now: number): { from: string; to: string } {
  return { from: vnDate(now - (days - 1) * DAY_MS), to: vnDate(now) };
}

export interface ActivityEventLike {
  kind: string;
  detail: Record<string, unknown>;
}

const isKind = (kind: string): kind is keyof typeof copy.kinds => kind in copy.kinds;

/** Tên loại hoạt động cho người đọc; loại lạ thì giữ nguyên. */
export function kindLabel(kind: string): string {
  return isKind(kind) ? copy.kinds[kind] : kind;
}

/** Câu hỏi chat đã che thông tin cá nhân; null khi không phải lượt chat hoặc thiếu câu hỏi. */
export function chatQuestion(event: ActivityEventLike): string | null {
  return event.kind === 'chat' && typeof event.detail.question === 'string' ? event.detail.question : null;
}

/** Một dòng mô tả ngắn cho cột "chi tiết" của sự kiện. */
export function describeEvent(event: ActivityEventLike): string {
  const { detail } = event;
  if (event.kind === 'chat') {
    const question = chatQuestion(event) ?? '';
    if (detail.answerKind === 'error') return `${question} · ${copy.chatError}`;
    if (detail.isAction === true) return `${question} · ${copy.chatAction}`;
    return question;
  }
  if (event.kind === 'view' && typeof detail.watchedMs === 'number') {
    return t('userActivity.watchedSeconds', { seconds: Math.round(detail.watchedMs / 1000) });
  }
  if (event.kind === 'reaction' && typeof detail.reaction === 'string') {
    const reaction = detail.reaction;
    return reaction in copy.reactions ? copy.reactions[reaction as keyof typeof copy.reactions] : reaction;
  }
  return '';
}
