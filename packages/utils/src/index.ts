// Hàm định dạng dùng chung cho mobile, web, admin. Không phụ thuộc React.

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/** 1250000 → "1.250.000 ₫" */
export const formatVnd = (amount: number): string => vnd.format(amount).replace(/ /g, ' ');

const UNITS: readonly [number, string][] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** Rút gọn số đếm lượt thích, lượt xem: 950 → "950", 1200 → "1,2K", 3400000 → "3,4M". */
export function compactCount(n: number): string {
  for (const [size, suffix] of UNITS) {
    if (Math.abs(n) >= size) {
      const v = Math.floor((n / size) * 10) / 10;
      return `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${suffix}`;
    }
  }
  return String(n);
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Ngày theo giờ Việt Nam: "04/11/2026". */
export const formatDate = (d: Date | string): string => dateFormat.format(typeof d === 'string' ? new Date(d) : d);

/** Số giây → "mm:ss" (đếm ngược giữ chỗ, độ dài video). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
