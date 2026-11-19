'use client';

import { useQuery } from '@tanstack/react-query';
import { userActivityControllerOverview } from '@tripflix/api-client/core-api/analytics/analytics';
import { vi } from '@tripflix/i18n';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBucketLabel } from '../ai-usage/ai-usage-format';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Panel } from '../shell/operations-ui';
import { fillDays } from './user-activity-format';

const copy = vi.userActivity;
const REFRESH_MS = 30_000;
const count = new Intl.NumberFormat('vi-VN');
const axisProps = { fontSize: 10, stroke: 'var(--color-text-muted)', tickLine: false } as const;

/**
 * Biểu đồ người hoạt động và bài đăng mới theo ngày (SCRUM-181). Số tổng nằm ở trang Tổng quan;
 * lượt chat, bình luận, xem nằm trong chi tiết từng người.
 */
export function UserActivityChart({ range, days }: { range: { from: string; to: string }; days: number }) {
  const overview = useQuery({
    queryKey: ['admin', 'user-activity', 'overview', range],
    queryFn: async ({ signal }) => (await userActivityControllerOverview(range, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const data = overview.isError ? undefined : overview.data;
  const chart = data
    ? fillDays(data.daily, range.from, range.to).map((day) => ({
        ...day,
        label: formatBucketLabel(`${day.date}T00:00:00+07:00`, 'day'),
      }))
    : [];
  const hasActivity = (data?.daily.length ?? 0) > 0;

  return (
    <section className="mb-6 space-y-4" aria-label={copy.overview.chart}>
      {overview.isError && <AdminApiError error={overview.error} retry={() => void overview.refetch()} />}
      {days > 1 && (
        <Panel title={copy.overview.chart}>
          {overview.isPending ? (
            <LoadingState />
          ) : !hasActivity ? (
            <EmptyState title={copy.overview.chartEmpty} />
          ) : (
            <div className="h-64 w-full p-4" aria-label={copy.overview.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface)' }}
                    formatter={(value) => count.format(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="activeUsers"
                    name={copy.overview.series.activeUsers}
                    fill="var(--color-teal)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="posts"
                    name={copy.overview.series.posts}
                    fill="var(--color-navy)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      )}
    </section>
  );
}
