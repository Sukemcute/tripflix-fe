'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { adminIndexHealthControllerCheck } from '@tripflix/api-client/core-api/admin-index-health/admin-index-health';
import { vi } from '@tripflix/i18n';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Metric, Panel } from '../shell/operations-ui';
const copy = vi.adminOperations;

export function AdminOverview() {
  const stats = useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: ({ signal }) => moderationApi.stats(signal),
    refetchInterval: 30_000,
  });
  const queue = useQuery({
    queryKey: ['moderation', 'overview-queue'],
    queryFn: ({ signal }) => moderationApi.queue({ view: 'pending', limit: 5 }, signal),
    refetchInterval: 30_000,
  });
  const log = useQuery({
    queryKey: ['moderation', 'overview-log'],
    queryFn: ({ signal }) => moderationApi.log({ limit: 5 }, signal),
    refetchInterval: 30_000,
  });
  const health = useQuery({
    queryKey: ['admin', 'search-index-health'],
    queryFn: async ({ signal }) => (await adminIndexHealthControllerCheck({ signal })).data,
    refetchInterval: 60_000,
  });
  const summary = stats.data;
  const chart = summary
    ? [
        { label: copy.posts, count: summary.pendingPosts },
        { label: copy.comments, count: summary.pendingComments },
      ]
    : [];
  return (
    <div className="space-y-6">
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />
      <section aria-label={copy.snapshot} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label={copy.pending}
          value={summary?.pendingTotal}
          hint={summary ? `${copy.reports}: ${summary.reports24h.toLocaleString('vi-VN')}` : undefined}
        />
        <Metric label={copy.urgent} value={summary?.pendingUrgent} urgent />
        <Metric label={copy.appeals} value={summary?.pendingAppeals} />
        <Metric label={copy.scans} value={summary?.failedScans} urgent />
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Panel
          title={copy.queueTitle}
          description={copy.queueHint}
          action={
            <Link className="text-xs font-bold text-teal-ink" href="/moderation">
              {copy.viewQueue} ↗
            </Link>
          }
        >
          <AdminApiError error={queue.error} retry={() => void queue.refetch()} />
          {queue.isPending ? (
            <LoadingState />
          ) : !queue.data?.items.length && !queue.error ? (
            <EmptyState title={copy.noPending} description={copy.noPendingHint} />
          ) : (
            <div className="overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>{copy.content}</th>
                    <th>{copy.priority}</th>
                    <th>{vi.moderation.reportCount}</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.data?.items.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-sm">
                        <span className="mb-1 block text-[10px] text-text-muted">
                          {item.targetType === 'post' ? copy.posts : copy.comments} ·{' '}
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        <Link href="/moderation" className="line-clamp-2 font-bold hover:text-teal-ink">
                          {item.targetPreview || item.targetId}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`ops-tag ${summary && item.severity >= summary.urgentSeverity ? 'text-danger' : 'text-text-muted'}`}
                        >
                          {item.severity}/100
                        </span>
                      </td>
                      <td className="tabular-nums">{item.reportCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-3 border-t border-border bg-surface/60 px-5 py-3 text-[10px] text-text-muted">
            <span>
              {copy.autoHidden}: {summary?.autoHidden24h ?? '—'}
            </span>
            <span>
              {copy.deferred}: {summary?.deferredScans ?? '—'}
            </span>
          </div>
        </Panel>
        <Panel title={copy.pendingBreakdown} description={copy.snapshot}>
          {stats.isPending ? (
            <LoadingState />
          ) : stats.isError ? (
            <EmptyState />
          ) : summary && summary.pendingTotal > 0 ? (
            <div className="p-5">
              <div
                className="h-48 w-full"
                aria-label={`${copy.posts}: ${summary.pendingPosts}, ${copy.comments}: ${summary.pendingComments}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} layout="vertical" margin={{ left: 0, right: 24 }}>
                    <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      fontSize={10}
                      stroke="var(--color-text-muted)"
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={78}
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      stroke="var(--color-text-muted)"
                    />
                    <Tooltip cursor={{ fill: 'var(--color-surface)' }} />
                    <Bar
                      dataKey="count"
                      name={copy.pending}
                      fill="var(--color-teal-ink)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={24}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <dl className="mt-4 flex justify-between border-t border-border pt-4 text-xs">
                <dt className="text-text-muted">{copy.pending}</dt>
                <dd className="font-bold tabular-nums">{summary.pendingTotal.toLocaleString('vi-VN')}</dd>
              </dl>
            </div>
          ) : (
            <EmptyState title={copy.noPending} />
          )}
        </Panel>
        <Panel
          title={copy.activity}
          description={copy.activityHint}
          action={
            <Link className="text-xs font-bold text-teal-ink" href="/audit">
              {copy.viewLog} ↗
            </Link>
          }
        >
          <AdminApiError error={log.error} retry={() => void log.refetch()} />
          {log.isPending ? (
            <LoadingState />
          ) : !log.data?.items.length && !log.error ? (
            <EmptyState description={copy.noActivity} />
          ) : (
            <ol className="divide-y divide-border">
              {log.data?.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">
                      {vi.moderation[item.action as 'hide' | 'restore' | 'remove' | 'dismiss'] ?? item.action}{' '}
                      · {item.targetType === 'comment' ? copy.comments : copy.posts}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-text-muted">
                      {vi.moderation.reasons[item.reasonCode as keyof typeof vi.moderation.reasons] ??
                        item.reasonCode}
                    </p>
                  </div>
                  <time className="shrink-0 text-[10px] text-text-muted" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel
          title={copy.infrastructure}
          action={
            <Link href="/search-monitor" className="text-xs font-bold text-teal-ink">
              {copy.checkWorkers} ↗
            </Link>
          }
        >
          <AdminApiError error={health.error} retry={() => void health.refetch()} />
          {health.isPending ? (
            <LoadingState />
          ) : !health.data?.workers.length && !health.error ? (
            <EmptyState description={copy.noWorkers} />
          ) : (
            <ul className="divide-y divide-border">
              {health.data?.workers.map((worker) => (
                <li key={worker.id} className="flex items-center justify-between gap-3 px-5 py-4 text-xs">
                  <span className="truncate font-bold">{worker.name}</span>
                  <span
                    className={`ops-tag ${worker.status === 'healthy' ? 'text-teal-ink' : worker.status === 'unknown' ? 'text-text-muted' : 'text-danger'}`}
                  >
                    {worker.status === 'healthy'
                      ? copy.healthy
                      : worker.status === 'offline'
                        ? copy.workerOffline
                        : worker.status === 'attention'
                          ? copy.attention
                          : copy.unknown}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
