'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiSession } from '@tripflix/api-client';
import { adminControllerGetMe } from '@tripflix/api-client/core-api/admin/admin';
import { t, vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LiveIndicator } from '../live/live-indicator';
import { useOpsAlerts } from '../live/ops-alerts';
import { StaffLiveProvider, useStaffLive } from '../live/staff-live';
import { Icon } from '../ui/icon';
import { Button, EmptyState, Skeleton } from '../ui/primitives';
import { AdminApiError } from './api-state';
import { adminNavGroups, canAccess, findNavItem, isActivePath, type AdminNavItem } from './nav';

const text = vi.adminConsole;

/**
 * Khung chung của mọi trang quản trị, đặt ở layout nên không dựng lại khi chuyển trang:
 * socket realtime, số liệu kiểm duyệt và menu giữ nguyên trạng thái.
 */
export function AdminConsole({ children }: { children: ReactNode }) {
  const { user, isReady, error, session } = useApiSession();
  const router = useRouter();
  const pathname = usePathname();
  const isStaff = user?.role === 'moderator' || user?.role === 'superadmin';

  const profile = useQuery({
    queryKey: ['admin', 'me', user?.id],
    enabled: isReady && isStaff,
    queryFn: async ({ signal }) => (await adminControllerGetMe({ signal })).data,
  });
  const logout = useMutation({
    mutationFn: () => session.logout(),
    onSuccess: () => router.replace('/login'),
  });

  useEffect(() => {
    if (isReady && !user && !error) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [isReady, user, error, pathname, router]);

  if (!isReady || (isStaff && profile.isPending)) return <ConsoleSplash />;

  if (!user)
    return (
      <CenteredNotice>
        <AdminApiError error={error} retry={() => void session.initialize()} />
        <Link className="text-sm font-semibold text-teal-ink underline" href={`/login?returnTo=${encodeURIComponent(pathname)}`}>
          {vi.api.loginRequired}
        </Link>
      </CenteredNotice>
    );

  if (!isStaff || profile.error)
    return (
      <CenteredNotice>
        {!isStaff && <p role="alert">{vi.api.staffOnly}</p>}
        <AdminApiError error={profile.error ?? logout.error} retry={profile.error ? () => void profile.refetch() : undefined} />
        <Button disabled={logout.isPending} onClick={() => logout.mutate()}>
          {vi.api.logout}
        </Button>
      </CenteredNotice>
    );

  return (
    <StaffLiveProvider>
      <ConsoleLayout
        role={user.role}
        displayName={profile.data?.displayName ?? user.displayName}
        email={profile.data?.email ?? user.email}
        onLogout={() => logout.mutate()}
        isLoggingOut={logout.isPending}
        logoutError={logout.error}
      >
        {children}
      </ConsoleLayout>
    </StaffLiveProvider>
  );
}

function ConsoleLayout({
  role,
  displayName,
  email,
  onLogout,
  isLoggingOut,
  logoutError,
  children,
}: {
  role: string;
  displayName: string;
  email: string;
  onLogout: () => void;
  isLoggingOut: boolean;
  logoutError: unknown;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const client = useQueryClient();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const current = findNavItem(pathname);
  const { alerts } = useOpsAlerts();
  const { stats } = useStaffLive();
  const badges = { pending: stats.data?.pendingTotal, alerts: alerts.length };
  const urgentAlerts = alerts.filter((alert) => alert.severity === 'critical').length;

  // Chuyển trang thì đóng menu trên điện thoại.
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setIsNavOpen(false);
  }

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--color-navy)_248px,var(--color-surface)_248px)]">
      <a
        href="#admin-content"
        className="sr-only z-50 rounded-lg bg-navy px-3 py-2 text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {text.skipToContent}
      </a>

      {isNavOpen && (
        <button
          type="button"
          aria-label={text.collapseNav}
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-navy text-background transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          isNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 px-5 pt-5 pb-4" aria-label={vi.admin.title}>
          <span className="grid size-9 place-items-center rounded-xl bg-background">
            <Image src="/icon.svg" alt="" width={24} height={25} />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">Tripflix</span>
            <span className="block text-[11px] text-background/60">{text.brandSub}</span>
          </span>
        </Link>

        <nav aria-label={text.navAria} className="flex-1 overflow-y-auto px-3 pb-4">
          {adminNavGroups.map((group) => {
            const items = group.items.filter((item) => canAccess(item.access, role));
            if (!items.length) return null;
            return (
              <div key={group.label} className="mt-4 first:mt-1">
                <p className="px-3 pb-1.5 text-[10px] font-bold tracking-widest text-background/40 uppercase">
                  {t(group.label)}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      isActive={isActivePath(item.href, pathname)}
                      badge={item.badge ? badges[item.badge] : undefined}
                      isUrgent={item.badge === 'alerts' && urgentAlerts > 0}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-background/10 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-background">
              {Array.from(displayName.trim())[0]?.toUpperCase() ?? 'A'}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="block truncate text-[11px] text-background/60" title={email}>
                {role === 'superadmin' ? text.roles.superadmin : text.roles.moderator}
              </span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              title={text.logout}
              className="grid size-8 place-items-center rounded-lg text-background/70 hover:bg-background/10 hover:text-background disabled:opacity-50"
            >
              <Icon name="logout" size={16} />
              <span className="sr-only">{vi.api.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="sm"
            icon="menu"
            className="lg:hidden"
            aria-label={text.openNav}
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(true)}
          />
          <p className="min-w-0 truncate text-sm font-semibold text-text-muted">
            {current ? t(current.label) : vi.admin.title}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <LiveIndicator />
            <Button
              variant="ghost"
              size="sm"
              icon="refresh"
              aria-label={text.refresh}
              title={text.refresh}
              onClick={() => void client.invalidateQueries()}
            />
            <Link
              href="/alerts"
              className="relative grid size-8 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
              aria-label={`${vi.admin.alerts}: ${alerts.length}`}
            >
              <Icon name="bell" size={18} />
              {alerts.length > 0 && (
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-bold text-background',
                    urgentAlerts ? 'bg-danger' : 'bg-coral',
                  )}
                >
                  {alerts.length}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main id="admin-content" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6">
          <AdminApiError error={logoutError} />
          {current && !canAccess(current.access, role) ? (
            <EmptyState icon="shield" title={text.forbidden} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  isActive,
  badge,
  isUrgent,
}: {
  item: AdminNavItem;
  isActive: boolean;
  badge: number | undefined;
  isUrgent: boolean;
}) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-background/12 text-background' : 'text-background/70 hover:bg-background/6 hover:text-background',
        )}
      >
        <span className={cn('transition-colors', isActive ? 'text-teal' : 'text-background/50 group-hover:text-background/80')}>
          <Icon name={item.icon} size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
        {badge ? (
          <span
            className={cn(
              'min-w-5 rounded-full px-1.5 text-center text-[10px] leading-5 font-bold tabular-nums',
              isUrgent ? 'bg-danger text-background' : 'bg-background/15 text-background',
            )}
          >
            {badge > 999 ? '999+' : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function ConsoleSplash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface" aria-busy="true">
      <output className="flex flex-col items-center gap-3 text-sm text-text-muted">
        <Skeleton className="size-10 rounded-xl" />
        {vi.api.loading}
      </output>
    </div>
  );
}

function CenteredNotice({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface p-6">
      <div className="flex w-full max-w-md flex-col items-start gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
