/** Số gọn kiểu TikTok cho trang cá nhân: 999, 1.2K, 3.4M. */
export function formatProfileCount(value: number): string {
  if (value >= 1_000_000) return `${(Math.floor(value / 100_000) / 10).toString()}M`;
  if (value >= 1_000) return `${(Math.floor(value / 100) / 10).toString()}K`;
  return String(Math.max(0, Math.floor(value)));
}

/** Tối đa 2 chữ cái đầu của tên để làm avatar khi chưa có ảnh. */
export function getNameInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase('vi-VN');
}
