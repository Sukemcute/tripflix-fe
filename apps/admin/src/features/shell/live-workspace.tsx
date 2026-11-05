'use client';
import { useApiSession } from '@tripflix/api-client';
import { adminControllerGetMe } from '@tripflix/api-client/core-api/admin/admin';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t, vi, type MessageKey } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { adminNav } from './nav';
import { AdminApiError } from './api-state';
import { StaffManagement } from '../staff/staff-management';
import { PostModeration } from '../moderation/post-moderation';
import { InventoryCalendar } from '../inventory/inventory-calendar';

export function AdminWorkspace({ label }: { label: MessageKey }) {
  const { user, isReady, error, session } = useApiSession();
  const router = useRouter();
  const path = adminNav.find((entry) => entry.label === label)?.href ?? '/moderation';
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
    if (isReady && !user && !error) router.replace(`/login?returnTo=${encodeURIComponent(path)}`);
  }, [isReady, user, error, path, router]);
  if (!isReady)
    return (
      <main className="admin-main">
        <output>{vi.api.loading}</output>
      </main>
    );
  if (!user)
    return (
      <main className="admin-main">
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
      <main className="admin-main">
        <p role="alert">{vi.api.staffOnly}</p>
        <AdminApiError error={logout.error} />
        <button className="admin-secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>
          {vi.api.logout}
        </button>
      </main>
    );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-logo">
          <Image src="/brand/tripflix-logo.svg" alt={vi.app.name} width={142} height={42} />
        </Link>
        <p className="admin-eyebrow">{vi.admin.title}</p>
        <nav aria-label={vi.demo.admin.navigation}>
          {adminNav
            .filter((entry) => user.role === 'superadmin' || entry.label === 'admin.moderation')
            .map((entry, index) => (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={entry.label === label ? 'page' : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {t(entry.label)}
              </Link>
            ))}
        </nav>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>{vi.admin.title}</span>
          <div>
            <span className="admin-session-email">{user.email}</span>
            <button className="admin-secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>
              {vi.api.logout}
            </button>
          </div>
        </header>
        <main id="admin-content" className="admin-main">
          <h1>{t(label)}</h1>
          <AdminApiError error={logout.error} />
          <AdminApiError
            error={profile.error}
            retry={() => {
              void profile.refetch();
            }}
          />
          <section className="admin-data">
            {profile.isPending ? (
              <output>{vi.api.loading}</output>
            ) : (
              profile.data &&
              (label === 'admin.moderation' ? (
                <PostModeration />
              ) : user.role !== 'superadmin' ? (
                <p role="alert">{vi.api.superadminOnly}</p>
              ) : label === 'admin.staff' ? (
                <StaffManagement />
              ) : label === 'admin.inventory' ? (
                <InventoryCalendar />
              ) : (
                <p className="admin-empty">
                  {label === 'admin.analytics' ? vi.api.analyticsUnavailable : vi.api.ordersUnavailable}
                </p>
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
