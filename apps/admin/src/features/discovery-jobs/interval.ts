/** Giới hạn BE nhận cho PUT /admin/discovery/jobs/{job}/interval. */
export const MIN_INTERVAL_MS = 60_000;
export const MAX_INTERVAL_MS = 86_400_000;
export const INTERVAL_PRESET_MINUTES = [5, 10, 15, 30, 60, 360] as const;

export const formatInterval = (ms: number) => (ms >= 3_600_000 && ms % 3_600_000 === 0 ? `${ms / 3_600_000} giờ` : `${ms / 60_000} phút`);

/** Đổi phút sang ms; trả null khi không phải số nguyên phút nằm trong giới hạn BE. */
export function toIntervalMs(minutes: number): number | null {
  const ms = minutes * 60_000;
  return Number.isInteger(minutes) && ms >= MIN_INTERVAL_MS && ms <= MAX_INTERVAL_MS ? ms : null;
}
