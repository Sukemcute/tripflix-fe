import type { MessageKey } from '@tripflix/i18n';

export interface AdminNavItem {
  readonly href: string;
  readonly label: MessageKey;
  readonly owner: string;
  readonly icon: 'overview' | 'moderation' | 'analytics' | 'inventory' | 'orders' | 'users' | 'alerts' | 'audit' | 'reports';
  readonly badge?: number;
}

/** Menu trang quản trị chuẩn theo thiết kế Trung tâm Vận hành Tripflix */
export const adminNav: readonly AdminNavItem[] = [
  { href: '/', label: 'admin.overview', icon: 'overview', owner: 'Dũng' },
  { href: '/moderation', label: 'admin.moderation', icon: 'moderation', badge: 312, owner: 'Trang' },
  { href: '/analytics', label: 'admin.analytics', icon: 'analytics', owner: 'Trang' },
  { href: '/search-monitor', label: 'admin.searchMonitoring', icon: 'analytics', owner: 'Trang' },
  { href: '/search-jobs', label: 'admin.searchJobs', icon: 'analytics', owner: 'Duy' },
  { href: '/recommend-jobs', label: 'admin.recommendJobs', icon: 'analytics', owner: 'Duy' },
  { href: '/orders', label: 'admin.orders', icon: 'orders', owner: 'Thắng' },
  { href: '/staff', label: 'admin.users', icon: 'users', owner: 'Dũng' },
  { href: '/alerts', label: 'admin.alerts', icon: 'alerts', badge: 12, owner: 'Hệ thống' },
  { href: '/audit', label: 'admin.audit', icon: 'audit', owner: 'Hệ thống' },
  { href: '/reports', label: 'admin.reports', icon: 'reports', owner: 'Ban điều hành' },
];

export const quickAccessLinks = [
  { href: '/moderation', label: 'admin.quickQueue', icon: 'shield' },
  { href: '/orders', label: 'admin.quickAbnormalOrders', icon: 'box' },
  { href: '/alerts', label: 'admin.quickCriticalAlerts', icon: 'alert' },
  { href: '/reports', label: 'admin.quickTodayReports', icon: 'doc' },
] as const;
