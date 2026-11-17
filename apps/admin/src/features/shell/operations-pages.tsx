'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { adminIndexHealthControllerCheck } from '@tripflix/api-client/core-api/admin-index-health/admin-index-health';
import { vi, t, type MessageKey } from '@tripflix/i18n';
import { AdminApiError } from './api-state';
import { EmptyState, LoadingState, Panel } from './operations-ui';
import { exportModerationCsv } from './operations-csv';

const copy = vi.adminOperations;
export function OperationsAlerts() {
  const stats = useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: ({ signal }) => moderationApi.stats(signal),
    refetchInterval: 30_000,
  });
  const health = useQuery({
    queryKey: ['admin', 'search-index-health'],
    queryFn: async ({ signal }) => (await adminIndexHealthControllerCheck({ signal })).data,
    refetchInterval: 60_000,
  });
  const items = [
    { label: copy.urgent, count: stats.data?.pendingUrgent, href: '/moderation' },
    { label: copy.appeals, count: stats.data?.pendingAppeals, href: '/moderation' },
    { label: copy.scans, count: stats.data?.failedScans, href: '/moderation' },
    { label: copy.deferred, count: stats.data?.deferredScans, href: '/moderation' },
  ].filter((item) => item.count && item.count > 0);
  const workers =
    health.data?.workers.filter((worker) => ['attention', 'offline'].includes(worker.status)) ?? [];
  return (
    <Panel title={vi.admin.alerts} description={copy.alertsHint}>
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />
      <AdminApiError error={health.error} retry={() => void health.refetch()} />
      {stats.isPending || health.isPending ? (
        <LoadingState />
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between gap-4 px-5 py-5 hover:bg-surface"
            >
              <div>
                <p className="text-sm font-bold">{item.label}</p>
                <p className="mt-1 text-xs text-text-muted">{copy.open} ↗</p>
              </div>
              <strong className="text-xl tabular-nums text-danger">{item.count}</strong>
            </Link>
          ))}
          {workers.map((worker) => (
            <Link
              href="/search-monitor"
              key={worker.id}
              className="flex items-center justify-between gap-4 px-5 py-5 hover:bg-surface"
            >
              <p className="text-sm font-bold">{worker.name}</p>
              <span className="text-xs text-danger">
                {worker.status === 'offline' ? copy.workerOffline : copy.attention} ↗
              </span>
            </Link>
          ))}
          {!stats.error && !health.error && !items.length && !workers.length && (
            <EmptyState title={copy.noAlerts} />
          )}
        </div>
      )}
    </Panel>
  );
}

export function OperationsLog({ exportable = false }: { exportable?: boolean }) {
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'log', {}],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.log({ limit: 30, cursor: String(pageParam) }, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
    refetchInterval: 30_000,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Panel
      title={exportable ? copy.loadedLog : vi.admin.audit}
      description={copy.logHint}
      action={
        exportable && (
          <button
            className="admin-secondary"
            disabled={!items.length}
            onClick={() => exportModerationCsv(items)}
          >
            {copy.export}
          </button>
        )
      }
    >
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <LoadingState />
      ) : !items.length && !query.error ? (
        <EmptyState description={copy.noActivity} />
      ) : (
        <div className="overflow-x-auto">
          <table className="ops-table">
            <thead>
              <tr>
                <th>{copy.created}</th>
                <th>{copy.action}</th>
                <th>{copy.content}</th>
                <th>{vi.moderation.reason}</th>
                <th>{vi.moderation.actor}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap">{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                  <td>
                    <span className="ops-tag">
                      {vi.moderation[item.action as 'hide' | 'restore' | 'remove' | 'dismiss'] ?? item.action}
                    </span>
                  </td>
                  <td>
                    <span className="text-text-muted">
                      {item.targetType === 'comment' ? copy.comments : copy.posts}
                    </span>
                    <code className="mt-1 block text-[10px]">{item.commentId ?? item.postId ?? '—'}</code>
                  </td>
                  <td>
                    {vi.moderation.reasons[item.reasonCode as keyof typeof vi.moderation.reasons] ??
                      item.reasonCode}
                  </td>
                  <td>
                    <span className="block">{item.actorType === 'system' ? copy.system : copy.staff}</span>
                    {item.actorType !== 'system' && (
                      <code className="text-[10px] text-text-muted">{item.moderatorId}</code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.hasNextPage && (
        <div className="border-t border-border p-4 text-center">
          <button
            className="admin-secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? vi.api.loading : copy.more}
          </button>
        </div>
      )}
    </Panel>
  );
}

export function UnavailableModule({ label }: { label: MessageKey }) {
  return (
    <Panel title={t(label)}>
      <EmptyState title={copy.unavailable} description={copy.unavailableHint} />
      <div className="flex flex-wrap justify-center gap-4 border-t border-border p-5 text-xs text-teal-ink">
        <Link href="/moderation">{copy.viewQueue} ↗</Link>
        <Link href="/audit">{copy.viewLog} ↗</Link>
        <Link href="/search-monitor">{copy.checkWorkers} ↗</Link>
      </div>
    </Panel>
  );
}
