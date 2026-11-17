/** Các tab của /account. File thường (không 'use client') để trang server đọc được ?tab=. */
// Đăng bài chỉ còn ở tab Cảm hứng (TF25): ?tab=create cũ mở tab Tài khoản.
export const ACCOUNT_TABS = ['profile', 'security', 'bookings', 'mine', 'bookmarks'] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

/** Đọc ?tab= của /account (ví dụ từ mục "Bài đăng của tôi" trên menu tài khoản); giá trị lạ thì mở tab Tài khoản. */
export function readAccountTab(value: unknown): AccountTab {
  return ACCOUNT_TABS.find((tab) => tab === value) ?? 'profile';
}
