export const AI_USAGE_RANGES = [7, 30, 90] as const;
export type AiUsageRangeDays = (typeof AI_USAGE_RANGES)[number];

const DAY_MS = 86_400_000;
// Ngày theo giờ Việt Nam, khớp cách API tính ngày.
const vnDate = (at: number) => new Date(at + 7 * 3_600_000).toISOString().slice(0, 10);

/** `days` ngày tính tới hôm nay (gồm hôm nay), dạng YYYY-MM-DD mà API nhận. */
export function aiUsageRange(days: AiUsageRangeDays, now: number): { from: string; to: string } {
  return { from: vnDate(now - (days - 1) * DAY_MS), to: vnDate(now) };
}

const usd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
/** Chi phí mỗi lần gọi rất nhỏ (cỡ 0,0001 USD): giữ 4 chữ số thập phân. */
export const formatUsd = (value: number) => `$${usd.format(value)}`;
