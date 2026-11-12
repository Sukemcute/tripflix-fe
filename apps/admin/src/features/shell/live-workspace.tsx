'use client';
import { useState } from 'react';
import { useApiSession } from '@tripflix/api-client';
import { adminControllerGetMe } from '@tripflix/api-client/core-api/admin/admin';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t, vi, type MessageKey } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { adminNav, quickAccessLinks, type AdminNavItem } from './nav';
import { AdminApiError } from './api-state';
import { StaffManagement } from '../staff/staff-management';
import { ModerationWorkspace } from '../moderation/moderation-workspace';
import { InventoryCalendar } from '../inventory/inventory-calendar';
import { AdminOverview } from '../overview/admin-overview';
import { SearchMonitoring } from '../search-monitoring/search-monitoring';
import { DiscoveryJobs } from '../discovery-jobs/discovery-jobs';
import searchStyles from '../search-monitoring/search-monitoring.module.css';
import {
  IconOverview,
  IconShield,
  IconTrending,
  IconReceipt,
  IconUsers,
  IconBell,
  IconAudit,
  IconReports,
  IconBox,
  IconAlert,
  IconDoc,
  IconCalendar,
  IconRefresh,
  CableCarSidebarIllustration,
} from './admin-icons';

/** Mục menu moderator được thấy; superadmin thấy tất cả. */
const MODERATOR_PAGES: readonly MessageKey[] = ['admin.overview', 'admin.moderation', 'admin.searchMonitoring', 'admin.searchJobs', 'admin.recommendJobs', 'admin.alerts', 'admin.audit'];

function renderNavIcon(icon: AdminNavItem['icon']) {
  switch (icon) {
    case 'overview': return <IconOverview />;
    case 'moderation': return <IconShield />;
    case 'analytics': return <IconTrending />;
    case 'orders': return <IconReceipt />;
    case 'users': return <IconUsers />;
    case 'alerts': return <IconBell />;
    case 'audit': return <IconAudit />;
    case 'reports': return <IconReports />;
    default: return <IconOverview />;
  }
}

function renderQuickIcon(icon: 'shield' | 'box' | 'alert' | 'doc') {
  switch (icon) {
    case 'shield': return <IconShield />;
    case 'box': return <IconBox />;
    case 'alert': return <IconAlert />;
    case 'doc': return <IconDoc />;
  }
}

export function AdminWorkspace({ label }: { label: MessageKey }) {
  const { user, isReady, error, session } = useApiSession();
  const router = useRouter();
  const path = adminNav.find((entry) => entry.label === label)?.href ?? '/';
  const isStaff = user?.role === 'moderator' || user?.role === 'superadmin';
  const [selectedRange, setSelectedRange] = useState('7 ngày qua (07/01 - 13/01)');

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
    <div className={`admin-shell ${label === 'admin.searchMonitoring' ? searchStyles.shell : ''}`}>
      {/* Dark Navy Sidebar */}
      <aside className="admin-sidebar">
        <Link href="/" className="admin-logo" aria-label="Tripflix Admin Dashboard">
          <div className="admin-brand-lockup">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="admin-brand-icon">
              <defs>
                <linearGradient id="tfLogoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FF7A00" />
                  <stop offset="50%" stopColor="#FF385C" />
                  <stop offset="100%" stopColor="#00A699" />
                </linearGradient>
              </defs>
              <path d="M5 3.5 L19 12 L5 20.5 Z" fill="url(#tfLogoGrad)" />
            </svg>
            <span className="admin-brand-text">
              Tripflix <span className="admin-brand-sub">Admin</span>
            </span>
          </div>
        </Link>

        {/* Danh mục menu chính */}
        <nav className="admin-nav" aria-label={vi.demo.admin.navigation}>
          {adminNav
            .filter((entry) => user.role === 'superadmin' || MODERATOR_PAGES.includes(entry.label))
            .map((entry) => {
              const isActive = entry.label === label;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={`admin-nav-item ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="admin-nav-icon">{renderNavIcon(entry.icon)}</span>
                  <span className="admin-nav-label">{t(entry.label)}</span>
                  {entry.badge ? <span className="admin-nav-badge">{entry.badge}</span> : null}
                </Link>
              );
            })}
        </nav>

        {/* Nhóm Lối tắt - Truy cập nhanh */}
        <div className="admin-quick-section">
          <p className="admin-quick-heading">{vi.admin.quickAccess}</p>
          <div className="admin-quick-list">
            {quickAccessLinks.map((item) => (
              <Link key={item.href} href={item.href} className="admin-quick-item">
                <span className="admin-quick-icon">{renderQuickIcon(item.icon)}</span>
                <span className="admin-quick-label">{t(item.label)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Minh hoạ Cáp treo đặc trưng phía chân sidebar */}
        <CableCarSidebarIllustration />
      </aside>

      {/* Main Container */}
      <div className="admin-workspace">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-topbar-title">Trung tâm vận hành Tripflix ✨</h1>
            <p className="admin-topbar-subtitle">
              Theo dõi, kiểm duyệt và quản trị toàn bộ hoạt động trên nền tảng
            </p>
          </div>

          <div className="admin-topbar-right">
            {/* Bộ chọn thời gian */}
            {label !== 'admin.searchMonitoring' && <>
            <div className="admin-date-picker">
              <IconCalendar />
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                aria-label="Khoảng thời gian thống kê"
              >
                <option value="7 ngày qua (07/01 - 13/01)">7 ngày qua (07/01 - 13/01)</option>
                <option value="Hôm nay">Hôm nay</option>
                <option value="30 ngày qua">30 ngày qua</option>
                <option value="Tháng này">Tháng này</option>
              </select>
            </div>

            {/* Nút làm mới */}
            <button
              type="button"
              className="admin-icon-btn"
              title="Làm mới dữ liệu"
              onClick={() => {
                void profile.refetch();
              }}
            >
              <IconRefresh />
            </button>
            </>}

            {/* Chuông thông báo & cảnh báo */}
            <Link href="/alerts" className="admin-bell-btn" title="Cảnh báo hệ thống" aria-label="12 cảnh báo">
              <IconBell />
              <span className="admin-bell-badge">12</span>
            </Link>

            {/* Profile Admin */}
            <div className="admin-user-profile">
              <div className="admin-avatar-wrap">
                <div className="admin-avatar">
                  <span>AD</span>
                </div>
                <span className="admin-online-dot" />
              </div>
              <div className="admin-user-info">
                <span className="admin-user-name">Admin</span>
                <span className="admin-user-role">
                  {user.role === 'superadmin' ? 'Quản trị hệ thống' : 'Kiểm duyệt viên'}
                </span>
              </div>
              <button
                type="button"
                className="admin-logout-link"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
                title="Đăng xuất"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        {/* Nội dung trang */}
        <main id="admin-content" className="admin-main-view">
          <AdminApiError error={logout.error} />
          <AdminApiError
            error={profile.error}
            retry={() => {
              void profile.refetch();
            }}
          />

          {label === 'admin.overview' ? (
            profile.isPending ? (
              <output>{vi.api.loading}</output>
            ) : (
              profile.data && <AdminOverview />
            )
          ) : label === 'admin.moderation' ? (
            profile.isPending ? (
              <output>{vi.api.loading}</output>
            ) : (
              profile.data && <ModerationWorkspace />
            )
          ) : label === 'admin.searchMonitoring' ? (
            profile.isPending ? <output>{vi.api.loading}</output> : profile.data && <SearchMonitoring />
          ) : label === 'admin.searchJobs' || label === 'admin.recommendJobs' ? (
            profile.isPending ? (
              <output>{vi.api.loading}</output>
            ) : (
              profile.data && <DiscoveryJobs key={label} group={label === 'admin.searchJobs' ? 'search' : 'recommend'} />
            )
          ) : label === 'admin.users' || label === 'admin.staff' ? (
            profile.isPending ? (
              <output>{vi.api.loading}</output>
            ) : user.role !== 'superadmin' ? (
              <section className="admin-content-card">
                <p role="alert">{vi.api.superadminOnly}</p>
              </section>
            ) : (
              profile.data && <StaffManagement />
            )
          ) : (
            <section className="admin-content-card">
              {profile.isPending ? (
                <output>{vi.api.loading}</output>
              ) : (
                profile.data &&
                (label === 'admin.inventory' ? (
                  <InventoryCalendar />
                ) : (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <h2>{t(label)}</h2>
                    <p className="admin-empty" style={{ marginTop: 12 }}>
                      {label === 'admin.analytics' ? vi.api.analyticsUnavailable : vi.api.ordersUnavailable}
                    </p>
                  </div>
                ))
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
