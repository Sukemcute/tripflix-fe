import type { MessageKey } from '@tripflix/i18n';
import type { IconName } from '../ui/icon';

/** Ai được thấy mục: staff = moderator và superadmin; superadmin = chỉ quản trị hệ thống. */
export type AdminAccess = 'staff' | 'superadmin';

export interface AdminNavItem {
  readonly href: string;
  readonly label: MessageKey;
  readonly icon: IconName;
  readonly access: AdminAccess;
  /** Số đếm sống trên menu, lấy từ số liệu thật (không ghi cứng). */
  readonly badge?: 'pending' | 'alerts';
}

export interface AdminNavGroup {
  readonly label: MessageKey;
  readonly items: readonly AdminNavItem[];
}

export const adminNavGroups: readonly AdminNavGroup[] = [
  {
    label: 'adminConsole.groups.operations',
    items: [
      { href: '/', label: 'admin.overview', icon: 'overview', access: 'staff' },
      { href: '/moderation', label: 'admin.moderation', icon: 'shield', access: 'staff', badge: 'pending' },
      { href: '/alerts', label: 'admin.alerts', icon: 'bell', access: 'staff', badge: 'alerts' },
      { href: '/audit', label: 'admin.audit', icon: 'audit', access: 'staff' },
    ],
  },
  {
    label: 'adminConsole.groups.discovery',
    items: [
      { href: '/search-monitor', label: 'admin.searchMonitoring', icon: 'search', access: 'staff' },
      { href: '/search-jobs', label: 'admin.searchJobs', icon: 'jobs', access: 'staff' },
      { href: '/recommend-jobs', label: 'admin.recommendJobs', icon: 'spark', access: 'staff' },
    ],
  },
  {
    label: 'adminConsole.groups.business',
    items: [
      { href: '/inventory', label: 'admin.inventory', icon: 'calendar', access: 'superadmin' },
      { href: '/orders', label: 'admin.orders', icon: 'receipt', access: 'superadmin' },
      { href: '/analytics', label: 'admin.analytics', icon: 'trend', access: 'superadmin' },
      { href: '/ai-usage', label: 'admin.aiUsage', icon: 'pulse', access: 'superadmin' },
      { href: '/reports', label: 'admin.reports', icon: 'report', access: 'superadmin' },
    ],
  },
  {
    label: 'adminConsole.groups.system',
    items: [{ href: '/staff', label: 'admin.staff', icon: 'users', access: 'superadmin' }],
  },
];

export function canAccess(access: AdminAccess, role: string | undefined): boolean {
  return role === 'superadmin' || (access === 'staff' && role === 'moderator');
}

/** Mục đang mở: khớp chính xác "/" hoặc tiền tố của trang con. */
export function isActivePath(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function findNavItem(pathname: string): AdminNavItem | undefined {
  return adminNavGroups.flatMap((group) => group.items).find((item) => isActivePath(item.href, pathname));
}
