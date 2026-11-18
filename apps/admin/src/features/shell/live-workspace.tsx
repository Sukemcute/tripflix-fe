'use client';
import { useEffect, useState } from 'react';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { adminControllerGetMe } from '@tripflix/api-client/core-api/admin/admin';
import { useMutation, useQuery, useQueryClient, useIsFetching } from '@tanstack/react-query';
import { t, vi, type MessageKey } from '@tripflix/i18n';
import Link from 'next/link';
import { adminNav, type AdminNavItem } from './nav';
import { usePathname, useRouter } from 'next/navigation';
import { AdminApiError } from './api-state';
import { StaffManagement } from '../staff/staff-management';
import { ModerationWorkspace } from '../moderation/moderation-workspace';
import { InventoryCalendar } from '../inventory/inventory-calendar';
import { AdminOverview } from '../overview/admin-overview';
import { SearchMonitoring } from '../search-monitoring/search-monitoring';
import { DiscoveryJobs } from '../discovery-jobs/discovery-jobs';
import { AnalyticsWorkspace } from '../analytics/analytics-workspace';
import { AiUsageReport } from '../ai-usage/ai-usage-report';
import { UserActivityWorkspace } from '../user-activity/user-activity-workspace';
import { OperationsAlerts, OperationsLog, UnavailableModule } from './operations-pages';
import { useAdminRealtime } from './use-admin-realtime';
import { LoadingState } from './operations-ui';
import {
  IconOverview,
  IconShield,
  IconTrending,
  IconReceipt,
  IconUsers,
  IconBell,
  IconAudit,
  IconReports,
  IconCalendar,
  IconRefresh,
} from './admin-icons';

const copy = vi.adminOperations;
const MODERATOR_PAGES: readonly MessageKey[] = [
  'admin.overview',
  'admin.moderation',
  'admin.searchMonitoring',
  'admin.searchJobs',
  'admin.recommendJobs',
  'admin.alerts',
  'admin.audit',
];
const icons = {
  overview: IconOverview,
  moderation: IconShield,
  analytics: IconTrending,
  inventory: IconCalendar,
  orders: IconReceipt,
  users: IconUsers,
  alerts: IconBell,
  audit: IconAudit,
  reports: IconReports,
};
const descriptions: Partial<Record<MessageKey, string>> = {
  'admin.overview': copy.overviewHint,
  'admin.moderation': copy.queueHint,
  'admin.searchMonitoring': vi.searchMonitoring.description,
  'admin.searchJobs': vi.discoveryJobs.search.description,
  'admin.recommendJobs': vi.discoveryJobs.recommend.description,
  'admin.staff': copy.staffHint,
  'admin.users': copy.staffHint,
  'admin.inventory': copy.calendarHint,
  'admin.audit': copy.logHint,
  'admin.alerts': copy.alertsHint,
  'admin.reports': copy.reportsHint,
  'admin.analytics': vi.analytics.description,
  'admin.aiUsage': vi.aiUsage.description,
  'admin.userActivity': vi.userActivity.description,
};
const groups = [
  { title: copy.operations, paths: ['/', '/moderation', '/alerts', '/audit'] },
  { title: copy.platform, paths: ['/search-monitor', '/search-jobs', '/recommend-jobs'] },
  { title: copy.management, paths: ['/staff', '/inventory', '/analytics', '/ai-usage', '/user-activity', '/orders', '/reports'] },
];

export function AdminWorkspace({ label }: { label: MessageKey }) {
  const { user, isReady, error, session } = useApiSession();
  const router = useRouter();
  const path = adminNav.find((entry) => entry.label === label)?.href ?? '/';
  const pathname = usePathname();
  const client = useQueryClient();
  const fetching = useIsFetching();
  const [menuOpen, setMenuOpen] = useState(false);
  const isStaff = user?.role === 'moderator' || user?.role === 'superadmin';
  const status = useAdminRealtime(isReady && isStaff);
  const profile = useQuery({
    queryKey: ['admin', 'me', user?.id],
    enabled: isReady && isStaff,
    queryFn: async ({ signal }) => (await adminControllerGetMe({ signal })).data,
  });
  const stats = useQuery({
    queryKey: ['moderation', 'stats'],
    enabled: isReady && isStaff,
    queryFn: ({ signal }) => moderationApi.stats(signal),
    refetchInterval: 30_000,
  });
  const logout = useMutation({
    mutationFn: () => session.logout(),
    onSuccess: () => router.replace('/login'),
  });
  useEffect(() => {
    if (isReady && !user && !error) router.replace(`/login?returnTo=${encodeURIComponent(path)}`);
  }, [isReady, user, error, path, router]);
  if (!isReady)
    return (
      <main className="mx-auto max-w-4xl p-8">
        <LoadingState />
      </main>
    );
  if (!user)
    return (
      <main className="mx-auto max-w-md space-y-5 p-8">
        <AdminApiError
          error={error}
          retry={() => {
            void session.initialize();
          }}
        />
        <Link href={`/login?returnTo=${encodeURIComponent(path)}`}>{vi.api.loginRequired}</Link>
      </main>
    );
  if (!isStaff)
    return (
      <main className="mx-auto max-w-md space-y-5 p-8">
        <p role="alert">{vi.api.staffOnly}</p>
        <AdminApiError error={logout.error} />
        <button className="admin-secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>
          {vi.api.logout}
        </button>
      </main>
    );
  const allowed = user.role === 'superadmin' || MODERATOR_PAGES.includes(label);
  const name = profile.data?.displayName ?? user.displayName;
  const renderLink = (entry: AdminNavItem) => {
    const Icon = icons[entry.icon];
    const active = entry.href === pathname;
    const count = entry.href === '/moderation' ? stats.data?.pendingTotal : undefined;
    return (
      <Link
        key={entry.href}
        href={entry.href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setMenuOpen(false)}
        className={`group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-xs transition-colors ${active ? 'bg-teal-soft font-bold text-teal-ink' : 'text-text-muted hover:bg-surface-muted hover:text-ink'}`}
      >
        <Icon className="shrink-0" />
        <span className="flex-1">{t(entry.label)}</span>
        {count !== undefined && (
          <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
        )}
      </Link>
    );
  };
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <a
        href="#admin-content"
        className="sr-only z-50 rounded-md bg-teal-ink p-3 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {copy.skip}
      </a>
      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          aria-label={copy.closeMenu}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="admin-navigation"
        className={`fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-border bg-background transition-transform lg:translate-x-0 ${menuOpen ? 'flex translate-x-0' : 'hidden -translate-x-full lg:flex'}`}
      >
        <Link href="/" className="flex h-20 shrink-0 items-center gap-2.5 px-6" aria-label={vi.admin.title}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-ink text-sm text-background"
            aria-hidden="true"
          >
            ▶
          </span>
          <span className="text-xl font-bold tracking-tight">
            tripflix<span className="ml-1 text-teal-ink">.</span>
          </span>
          <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-text-muted">
            ADMIN
          </span>
        </Link>
        <nav aria-label={copy.navigation} className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-text-subtle">
                {group.title}
              </p>
              <div className="space-y-1">
                {adminNav
                  .filter(
                    (entry) =>
                      group.paths.includes(entry.href) &&
                      (user.role === 'superadmin' || MODERATOR_PAGES.includes(entry.label)),
                  )
                  .map(renderLink)}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sea-mist text-xs font-bold text-teal-ink">
              {name
                ?.trim()
                .split(/\s+/)
                .map((word) => word[0])
                .slice(-2)
                .join('')
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{name}</p>
              <p className="mt-1 text-[10px] text-text-muted">
                {user.role === 'superadmin' ? copy.superadmin : copy.moderator}
              </p>
            </div>
          </div>
          <button
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className="mt-3 text-xs text-text-muted hover:text-danger"
          >
            {vi.api.logout} ↗
          </button>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-sm xl:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded border border-border px-2 py-1 lg:hidden"
              aria-label={copy.menu}
              aria-expanded={menuOpen}
              aria-controls="admin-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
            <p className="text-xs text-text-muted">
              Tripflix <span className="mx-2 text-text-subtle">/</span>
              <span className="font-bold text-ink">{t(label)}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <output className="flex items-center gap-2 text-[10px] text-text-muted" aria-live="polite">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-teal' : status === 'offline' ? 'bg-danger' : 'bg-sun'}`}
              />
              {status === 'live' ? copy.live : status === 'offline' ? copy.offline : copy.reconnecting}
            </output>
            <button
              className="rounded-md border border-border p-2 text-text-muted hover:bg-surface-muted"
              title={copy.refresh}
              aria-label={copy.refresh}
              onClick={() => void client.invalidateQueries({ refetchType: 'active' })}
            >
              <IconRefresh className={fetching ? 'motion-safe:animate-spin' : ''} />
            </button>
          </div>
        </header>
        <main
          id="admin-content"
          className="ops-content mx-auto max-w-[1600px] space-y-6 p-5 xl:p-8"
          tabIndex={-1}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-widest text-text-muted">{copy.workspace}</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {label === 'admin.overview' ? copy.overviewTitle : t(label)}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {descriptions[label] ?? copy.unavailableHint}
              </p>
            </div>
            {stats.data && (
              <p className="text-[10px] text-text-muted">
                {copy.updated} {new Date(stats.data.generatedAt).toLocaleTimeString('vi-VN')}
              </p>
            )}
          </div>
          <AdminApiError error={logout.error} />
          <AdminApiError error={profile.error} retry={() => void profile.refetch()} />
          {!allowed ? (
            <p role="alert">{vi.api.superadminOnly}</p>
          ) : profile.isPending ? (
            <LoadingState />
          ) : profile.data ? (
            <>
              {label === 'admin.overview' ? (
                <AdminOverview />
              ) : label === 'admin.moderation' ? (
                <ModerationWorkspace />
              ) : label === 'admin.searchMonitoring' ? (
                <SearchMonitoring />
              ) : label === 'admin.analytics' ? (
                <AnalyticsWorkspace />
              ) : label === 'admin.aiUsage' ? (
                <AiUsageReport />
              ) : label === 'admin.userActivity' ? (
                <UserActivityWorkspace />
              ) : label === 'admin.searchJobs' || label === 'admin.recommendJobs' ? (
                <DiscoveryJobs key={label} group={label === 'admin.searchJobs' ? 'search' : 'recommend'} />
              ) : label === 'admin.users' || label === 'admin.staff' ? (
                <StaffManagement />
              ) : label === 'admin.inventory' ? (
                <InventoryCalendar />
              ) : label === 'admin.alerts' ? (
                <OperationsAlerts />
              ) : label === 'admin.audit' || label === 'admin.reports' ? (
                <OperationsLog exportable={label === 'admin.reports'} />
              ) : (
                <UnavailableModule label={label} />
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
