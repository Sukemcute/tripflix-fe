/** Giới hạn BE nhận cho POST /admin/discovery/jobs/{job}/stop. */
export const STOP_REASON_LIMITS = { min: 3, max: 300 } as const;

/** Lý do dừng hợp lệ (đã bỏ khoảng trắng hai đầu như BE), hoặc null. */
export function toStopReason(value: string): string | null {
  const reason = value.trim();
  return reason.length >= STOP_REASON_LIMITS.min && reason.length <= STOP_REASON_LIMITS.max ? reason : null;
}
