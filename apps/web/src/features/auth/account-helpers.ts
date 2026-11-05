/** Địa chỉ trang quản trị (apps/admin). Trống thì ẩn mọi lối vào trang quản trị trên web. */
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3200';

/** Kiểm duyệt viên và quản trị viên là nhân viên, được vào trang quản trị. */
export function isStaffRole(role: string): boolean {
  return role === 'moderator' || role === 'superadmin';
}

/** Chữ cái đầu của tên để làm avatar (header, trang tài khoản); tên trống thì dùng dấu chấm. */
export function getInitial(displayName: string): string {
  return Array.from(displayName.trim())[0]?.toUpperCase() ?? '·';
}
