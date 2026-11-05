'use client';
import { socialApi, useApiSession } from '@tripflix/api-client';
import * as admin from '@tripflix/api-client/core-api/admin/admin';
import type { AdminPostsControllerListAdminPostsStatus } from '@tripflix/api-client/core-api/model/index';
import { useQueries, useQuery } from '@tanstack/react-query';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { adminNav } from '../shell/nav';
import { AdminApiError } from '../shell/api-state';

const POST_METRICS = [
  { status: 'published', label: vi.api.metricPublished },
  { status: 'hidden', label: vi.api.metricHidden },
  { status: 'removed', label: vi.api.metricRemoved },
] as const satisfies readonly { status: AdminPostsControllerListAdminPostsStatus; label: string }[];

/**
 * Trang Tổng quan của admin, khác nhau theo vai trò.
 * Moderator: số bài theo trạng thái và bài mới đăng. Superadmin: thêm số tài khoản, nhân sự và lối tắt.
 */
export function AdminOverview() {
  const { user } = useApiSession();
  const isSuperadmin = user?.role === 'superadmin';
  // Khoá bắt đầu bằng 'admin-posts' để màn Kiểm duyệt xử lý xong thì số ở đây cũng tải lại.
  const postCounts = useQueries({
    queries: POST_METRICS.map(({ status }) => ({
      queryKey: ['admin-posts', 'count', status],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        socialApi.listAdminPosts({ status, limit: 1 }, signal),
    })),
  });
  const recent = useQuery({
    queryKey: ['admin-posts', 'recent'],
    queryFn: ({ signal }) => socialApi.listAdminPosts({ status: 'published', limit: 5 }, signal),
  });
  // Cùng khoá với màn Nhân sự để dùng chung dữ liệu đã tải.
  const users = useQuery({
    queryKey: ['admin', 'users', '', 1],
    enabled: isSuperadmin,
    queryFn: async ({ signal }) =>
      (await admin.adminControllerSearchUsers({ query: '', page: 1 }, { signal })).data,
  });
  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    enabled: isSuperadmin,
    queryFn: async ({ signal }) => (await admin.adminControllerListStaff({ signal })).data,
  });
  if (!user) return null;

  const metrics = [
    ...POST_METRICS.map(({ label }, index) => ({
      label,
      value: postCounts[index]?.data?.total,
      href: '/moderation',
    })),
    ...(isSuperadmin
      ? [
          { label: vi.api.metricUsers, value: users.data?.total, href: '/staff' },
          { label: vi.api.metricStaff, value: staff.data?.length, href: '/staff' },
        ]
      : []),
  ];
  const failed = [...postCounts, users, staff].find((query) => query.error);

  return (
    <div className={`admin-overview ${isSuperadmin ? 'is-superadmin' : 'is-moderator'}`}>
      <header className="admin-overview-hero">
        <span className="admin-eyebrow">{isSuperadmin ? vi.api.superadmin : vi.api.moderator}</span>
        <h1>{t('api.overviewGreeting', { name: user.displayName })}</h1>
        <p>{isSuperadmin ? vi.api.overviewSuperadminHint : vi.api.overviewModeratorHint}</p>
      </header>

      {failed && (
        <AdminApiError
          error={failed.error}
          retry={() => {
            void failed.refetch();
          }}
        />
      )}

      <ul className="admin-overview-metrics">
        {metrics.map((metric) => (
          <li key={metric.label}>
            <Link href={metric.href}>
              <span>{metric.label}</span>
              <strong>{metric.value ?? '—'}</strong>
            </Link>
          </li>
        ))}
      </ul>

      <div className="admin-overview-grid">
        <section className="admin-data admin-overview-recent">
          <div className="admin-data-heading">
            <div>
              <h2>{vi.api.recentPosts}</h2>
              <p>{vi.api.recentPostsHint}</p>
            </div>
            <Link className="admin-secondary" href="/moderation">
              {vi.api.openModeration}
            </Link>
          </div>
          <AdminApiError
            error={recent.error}
            retry={() => {
              void recent.refetch();
            }}
          />
          {recent.isPending && <output className="admin-empty">{vi.api.loading}</output>}
          {recent.data?.items.length === 0 && <p className="admin-empty">{vi.api.noRecentPosts}</p>}
          <ol className="admin-overview-posts">
            {recent.data?.items.map((post) => (
              <li key={post.id}>
                <div>
                  <strong>{post.title}</strong>
                  <p>
                    {post.author.display_name} · {new Date(post.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                {post.report_count > 0 && (
                  <span className="admin-overview-reports">
                    {t('api.reportCount', { count: String(post.report_count) })}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {isSuperadmin && (
          <section className="admin-data admin-overview-shortcuts">
            <div className="admin-data-heading">
              <h2>{vi.api.shortcuts}</h2>
            </div>
            <ul>
              {adminNav
                .filter((entry) => entry.href !== '/')
                .map((entry) => (
                  <li key={entry.href}>
                    <Link href={entry.href}>
                      {t(entry.label)}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
