/** Mỗi khung hình đi thêm phần này của quãng còn lại: nhanh lúc đầu, chậm dần khi gần tới (giống cuộn gốc). */
export const SMOOTH_SCROLL_EASING = 0.2;

/** Quy đổi deltaY của sự kiện wheel ra pixel (chuột cũ báo theo dòng hoặc theo trang). */
export function wheelDeltaToPixels(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * 40;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

/**
 * Đích cuộn mới sau một lượt wheel. Cộng dồn vào đích đang chạy dở (nếu có) để lăn liên tục
 * không bị hụt quãng, và không vượt quá đầu/cuối danh sách.
 */
export function nextScrollTarget(options: {
  pendingTarget: number | null;
  scrollTop: number;
  delta: number;
  maxScroll: number;
}): number {
  const base = options.pendingTarget ?? options.scrollTop;
  return Math.min(Math.max(base + options.delta, 0), Math.max(options.maxScroll, 0));
}

/** Vị trí ở khung hình kế tiếp; trả `null` khi đã tới đích (dưới nửa pixel) để dừng vòng lặp. */
export function stepScrollTowards(current: number, target: number): number | null {
  const remaining = target - current;
  if (Math.abs(remaining) < 0.5) return null;
  return current + remaining * SMOOTH_SCROLL_EASING;
}
