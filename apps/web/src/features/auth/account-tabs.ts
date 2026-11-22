/** Các tab của /account. File thường (không 'use client') để trang server đọc được ?tab=. */
// Đăng bài chỉ còn ở tab Cảm hứng (TF25): ?tab=create cũ mở tab Tài khoản.
export const ACCOUNT_TABS = ['profile', 'security'] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

/** Đọc ?tab= của /account; các tab cũ và giá trị lạ mở phần thông tin tài khoản. */
export function readAccountTab(value: unknown): AccountTab {
  return ACCOUNT_TABS.find((tab) => tab === value) ?? 'profile';
}
