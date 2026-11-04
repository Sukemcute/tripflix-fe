import type { MessageKey } from '@tripflix/i18n';

/** Menu trang quản trị. Mỗi mục ứng với một module BE và một chủ. */
export const adminNav: readonly { href: string; label: MessageKey; owner: string }[] = [
  { href: '/moderation', label: 'admin.moderation', owner: 'Trang' },
  { href: '/analytics', label: 'admin.analytics', owner: 'Trang' },
  { href: '/inventory', label: 'admin.inventory', owner: 'Thắng' },
  { href: '/orders', label: 'admin.orders', owner: 'Thắng' },
  { href: '/staff', label: 'admin.staff', owner: 'Dũng' },
];
