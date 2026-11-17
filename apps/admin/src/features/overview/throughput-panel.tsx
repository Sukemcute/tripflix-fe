'use client';
import { useQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Panel } from '../shell/operations-ui';
import { buildThroughput, countActions, selectThroughputWindow } from './throughput';

const copy = vi.adminOperations;
const actionLabels = vi.moderation as unknown as Record<string, string>;
const hourFormat = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', hour12: false });
/** Số thao tác gần nhất dùng để vẽ; đủ cho một ngày ở quy mô hiện tại mà không cần API thống kê riêng. */
const SAMPLE_SIZE = 100;

/** Nhịp xử lý 24 giờ: kiểm duyệt viên và hệ thống làm bao nhiêu quyết định mỗi giờ (TF104). */
export function ThroughputPanel() {
  const log = useQuery({
    queryKey: ['moderation', 'overview-throughput'],
    queryFn: ({ signal }) => moderationApi.log({ limit: SAMPLE_SIZE }, signal),
    refetchInterval: 60_000,
  });
  const items = selectThroughputWindow(log.data?.items ?? [], log.dataUpdatedAt);
  const buckets = buildThroughput(items, log.dataUpdatedAt).map((bucket) => ({
    ...bucket,
    hour: hourFormat.format(bucket.startsAt),
  }));
  const hasActivity = buckets.some((bucket) => bucket.staff + bucket.system > 0);
  const actions = countActions(items);
  const maxAction = Math.max(1, ...actions.map(([, count]) => count));

  return (
    <Panel title={copy.throughput} description={copy.throughputHint}>
      <AdminApiError error={log.error} retry={() => void log.refetch()} />
      {log.isPending ? (
        <LoadingState />
      ) : !hasActivity && !log.error ? (
        <EmptyState description={copy.throughputEmpty} />
      ) : (
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <div className="h-56 w-full" aria-label={copy.throughput}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="hour" fontSize={10} stroke="var(--color-text-muted)" tickLine={false} interval={2} />
                <YAxis allowDecimals={false} fontSize={10} stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'var(--color-surface)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="staff" name={copy.throughputStaff} stackId="actor" fill="var(--color-navy)" isAnimationActive={false} />
                <Bar
                  dataKey="system"
                  name={copy.throughputSystem}
                  stackId="actor"
                  fill="var(--color-teal)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-bold text-text-muted">{copy.actionMix}</h3>
            <ul className="space-y-2.5">
              {actions.map(([action, count]) => (
                <li key={action} className="grid grid-cols-[80px_minmax(0,1fr)_32px] items-center gap-3 text-xs">
                  <span className="font-bold">{actionLabels[action] ?? action}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-teal-ink"
                      style={{ width: `${(count / maxAction) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-bold tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}
