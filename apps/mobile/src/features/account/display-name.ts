/**
 * Tên hiện cho một người dùng. Không có tên hiển thị thì dùng nhãn chung,
 * không bao giờ lộ một đoạn mã tài khoản ra giao diện.
 */
export function getDisplayName(name: string | null | undefined, fallback: string): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : fallback;
}
