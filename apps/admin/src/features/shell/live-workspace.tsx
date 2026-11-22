'use client';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { adminControllerGetMe } from '@tripflix/api-client/core-api/admin/admin';
import { useMutation, useQuery, useQueryClient, useIsFetching } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminButton } from '@/ui/button';
import { CloseIcon, LogoutIcon, MenuIcon, RefreshIcon } from '@/ui/icons';
import { SidebarNav } from '@/ui/sidebar-nav';
import { AdminApiError } from './api-state';
import { getVisibleNavGroups } from './nav';
import { LoadingState } from './operations-ui';
import { useAdminRealtime } from './use-admin-realtime';

const copy = vi.adminOperations;

const realtimeLabels = {
  live: { short: copy.liveShort, full: copy.live, dot: 'bg-teal' },
  offline: { short: copy.offlineShort, full: copy.offline, dot: 'bg-danger' },
  connecting: { short: copy.reconnectingShort, full: copy.reconnecting, dot: 'bg-sun' },
} as const;

function Logo() {
  return (
    <Link href="/" className="flex h-14 shrink-0 items-center gap-2.5 px-5" aria-label={vi.admin.title}>
      <Image src="/brand/tripflix-logo.svg" alt="" width={81} height={24} priority className="h-6 w-auto" />
      <span className="rounded-adm-sm border border-border px-1.5 text-xs text-text-muted">Admin</span>
    </Link>
  );
}

/**
 * Khung chung của Admin: đăng nhập, quyền, menu, realtime. Nằm trong layout của route group `(console)`
 * nên không bị dựng lại khi chuyển trang. Từng trang tự kiểm quyền và vẽ tiêu đề qua `AdminPage`.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isReady, error, session } = useApiSession();
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const fetching = useIsFetching();
  // Menu mobile mở theo trang đang xem: chuyển trang thì tự đóng, không cần effect.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const setMenuOpen = (open: boolean) => setMenuPath(open ? pathname : null);
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
    if (isReady && !user && !error) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [isReady, user, error, pathname, router]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuPath(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

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
        <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`}>{vi.api.loginRequired}</Link>
      </main>
    );
  if (!isStaff)
    return (
      <main className="mx-auto max-w-md space-y-5 p-8">
        <p role="alert">{vi.api.staffOnly}</p>
        <AdminApiError error={logout.error} />
        <AdminButton disabled={logout.isPending} onClick={() => logout.mutate()}>
          {vi.api.logout}
        </AdminButton>
      </main>
    );

  const name = profile.data?.displayName ?? user.displayName;
  const initials = name
    ?.trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(-2)
    .join('')
    .toUpperCase();
  const realtime = realtimeLabels[status];

  return (
    <div className="min-h-dvh bg-background text-ink">
      <a
        href="#admin-content"
        className="sr-only z-50 rounded-adm bg-teal-ink p-3 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {copy.skip}
      </a>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          aria-label={copy.closeMenu}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="admin-navigation"
        className={`fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-border bg-surface lg:flex ${menuOpen ? 'flex' : 'hidden'}`}
      >
        <Logo />
        <SidebarNav
          label={copy.navigation}
          groups={getVisibleNavGroups(user.role)}
          pathname={pathname}
          counts={{ '/moderation': stats.data?.pendingTotal }}
        />
        <div className="space-y-3 border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-1">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-adm bg-surface-muted text-xs text-ink"
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px]">{name}</p>
              <p className="text-xs text-text-muted">
                {user.role === 'superadmin' ? copy.superadmin : copy.moderator}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <output
              className="flex min-w-0 flex-1 items-center gap-2 px-1 text-xs text-text-muted"
              aria-live="polite"
              title={realtime.full}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${realtime.dot}`} aria-hidden="true" />
              <span className="truncate">{realtime.short}</span>
            </output>
            <AdminButton
              variant="ghost"
              size="icon"
              title={copy.refresh}
              aria-label={copy.refresh}
              onClick={() => void client.invalidateQueries({ refetchType: 'active' })}
            >
              <RefreshIcon className={fetching ? 'motion-safe:animate-spin' : ''} />
            </AdminButton>
            <AdminButton
              variant="ghost"
              size="icon"
              title={vi.api.logout}
              aria-label={vi.api.logout}
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <LogoutIcon />
            </AdminButton>
          </div>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background px-3 lg:hidden">
          <AdminButton
            variant="ghost"
            size="icon"
            aria-label={copy.menu}
            aria-expanded={menuOpen}
            aria-controls="admin-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </AdminButton>
          <Image src="/brand/tripflix-logo.svg" alt={vi.admin.title} width={67} height={20} className="h-5 w-auto" />
        </header>
        <main id="admin-content" className="focus:outline-none" tabIndex={-1}>
          <AdminApiError error={logout.error} />
          <AdminApiError error={profile.error} retry={() => void profile.refetch()} />
          {profile.isPending ? (
            <LoadingState />
          ) : profile.data ? (
            // Trang dùng useSearchParams (trạng thái trên URL) cần ranh giới Suspense.
            <Suspense fallback={<LoadingState />}>{children}</Suspense>
          ) : null}
        </main>
      </div>
    </div>
  );
}
