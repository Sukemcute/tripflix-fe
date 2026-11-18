const APPEAL_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

/** Số ngày còn lại để khiếu nại, tính từ lúc ra quyết định; tối thiểu 1 khi vẫn còn hạn. */
export function getAppealDaysLeft(createdAt: string, now = Date.now()): number {
  const msLeft = new Date(createdAt).getTime() + APPEAL_WINDOW_DAYS * DAY_MS - now;
  return Math.max(1, Math.ceil(msLeft / DAY_MS));
}
