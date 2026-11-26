import { explorer as x, type ExplorerTypeRole } from '@tripflix/tokens';

/**
 * Cỡ chữ và chiều cao dòng của một vai trò trong thang explorer, để viết `...typeStyle('label')` thay cho
 * compactType cũ (10–13px). Phông và màu vẫn khai báo riêng ở từng style.
 */
export function typeStyle(role: ExplorerTypeRole): { fontSize: number; lineHeight: number } {
  const { fontSize, lineHeight } = x.type[role];
  return { fontSize, lineHeight };
}
