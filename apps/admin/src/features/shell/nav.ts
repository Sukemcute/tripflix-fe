import { vi, type MessageKey } from '@tripflix/i18n';
import type { AdminNavGroup, AdminNavItem } from '@/ui/nav-types';

export type { AdminNavGroup, AdminNavItem };

const operations = vi.adminOperations;

/** Nguồn duy nhất cho nhóm menu, quyền truy cập, icon và mô tả trang của Admin. */
export const adminNavGroups: readonly AdminNavGroup[] = [
  {
    id: 'overview',
    items: [
      {
        href: '/',
        label: 'admin.overview',
        icon: 'overview',
        minRole: 'moderator',
        description: operations.overviewHint,
      },
    ],
  },
  {
    id: 'content',
    label: operations.navGroups.content,
    items: [
      {
        href: '/moderation',
        label: 'admin.moderation',
        icon: 'moderation',
        minRole: 'moderator',
        description: operations.queueHint,
      },
      {
        href: '/alerts',
        label: 'admin.alerts',
        icon: 'alerts',
        minRole: 'moderator',
        description: operations.alertsHint,
      },
      {
        href: '/audit',
        label: 'admin.audit',
        icon: 'audit',
        minRole: 'moderator',
        description: operations.logHint,
      },
      {
        href: '/reports',
        label: 'admin.reports',
        icon: 'reports',
        minRole: 'superadmin',
        description: operations.reportsHint,
      },
    ],
  },
  {
    id: 'commerce',
    label: operations.navGroups.commerce,
    items: [
      {
        href: '/orders',
        label: 'admin.orders',
        icon: 'orders',
        minRole: 'superadmin',
        description: vi.adminOrders.description,
      },
      {
        href: '/inventory',
        label: 'admin.inventory',
        icon: 'inventory',
        minRole: 'superadmin',
        description: operations.calendarHint,
      },
    ],
  },
  {
    id: 'people',
    label: operations.navGroups.people,
    items: [
      {
        href: '/user-activity',
        label: 'admin.userActivity',
        icon: 'userActivity',
        minRole: 'superadmin',
        description: vi.userActivity.description,
      },
      {
        href: '/staff',
        label: 'admin.staff',
        icon: 'staff',
        minRole: 'superadmin',
        description: operations.staffHint,
      },
    ],
  },
  {
    id: 'system',
    label: operations.navGroups.system,
    items: [
      {
        href: '/analytics',
        label: 'admin.analytics',
        icon: 'analytics',
        minRole: 'superadmin',
        description: vi.analytics.description,
      },
      {
        href: '/search-monitor',
        label: 'admin.searchMonitoring',
        icon: 'searchMonitor',
        minRole: 'moderator',
        description: vi.searchMonitoring.description,
      },
      {
        href: '/search-jobs',
        label: 'admin.searchJobs',
        icon: 'searchJobs',
        minRole: 'moderator',
        description: vi.discoveryJobs.search.description,
      },
      {
        href: '/recommend-jobs',
        label: 'admin.recommendJobs',
        icon: 'recommendJobs',
        minRole: 'moderator',
        description: vi.discoveryJobs.recommend.description,
      },
      {
        href: '/ai-usage',
        label: 'admin.aiUsage',
        icon: 'aiUsage',
        minRole: 'superadmin',
        description: vi.aiUsage.description,
      },
    ],
  },
];

export const adminNav: readonly AdminNavItem[] = adminNavGroups.flatMap((group) => group.items);

export function canAccessNavItem(role: string | undefined, item: AdminNavItem): boolean {
  if (role === 'superadmin') return true;
  return role === 'moderator' && item.minRole === 'moderator';
}

export function findNavItem(label: MessageKey): AdminNavItem | undefined {
  return adminNav.find((item) => item.label === label);
}

/** Nhóm và mục mà vai trò này được thấy; nhóm rỗng bị bỏ. */
export function getVisibleNavGroups(role: string | undefined): AdminNavGroup[] {
  return adminNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccessNavItem(role, item)) }))
    .filter((group) => group.items.length > 0);
}

export const quickAccessLinks = [
  { href: '/moderation', label: 'admin.quickQueue', icon: 'shield' },
  { href: '/orders', label: 'admin.quickAbnormalOrders', icon: 'box' },
  { href: '/alerts', label: 'admin.quickCriticalAlerts', icon: 'alert' },
  { href: '/reports', label: 'admin.quickTodayReports', icon: 'doc' },
] as const;
