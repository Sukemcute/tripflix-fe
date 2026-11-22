'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import type { ModerationLogDto } from '@tripflix/api-client/core-api/model/index';
import { adminIndexHealthControllerCheck } from '@tripflix/api-client/core-api/admin-index-health/admin-index-health';
import { vi, t, type MessageKey } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { LoadMore } from '@/ui/pagination';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { AdminApiError } from './api-state';
import { exportModerationCsv } from './operations-csv';
import { Panel } from './operations-ui';

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
  const rowClass = 'flex items-center gap-3 px-3 py-3 transition-colors duration-150 ease-adm hover:bg-surface';
  return (
    <div className="space-y-3">
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />
      <AdminApiError error={health.error} retry={() => void health.refetch()} />
      {stats.isPending || health.isPending ? (
        <LoadingState />
      ) : items.length || workers.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className={rowClass}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                <span className="flex-1 text-[13px]">{item.label}</span>
                <span className="text-xs text-text-muted">{copy.open}</span>
                <strong className="min-w-8 text-right text-sm font-semibold text-coral-ink tabular-nums">
                  {item.count}
                </strong>
              </Link>
            </li>
          ))}
          {workers.map((worker) => (
            <li key={worker.id}>
              <Link href="/search-monitor" className={rowClass}>
                <span className="flex-1 text-[13px]">{worker.name}</span>
                <StatusBadge tone={worker.status === 'offline' ? 'danger' : 'warning'}>
                  {worker.status === 'offline' ? copy.workerOffline : copy.attention}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !stats.error && !health.error && <EmptyState title={copy.noAlerts} />
      )}
    </div>
  );
}

type LogItem = ModerationLogDto;

const actionTone: Record<string, StatusTone> = {
  hide: 'warning',
  restore: 'success',
  remove: 'danger',
  dismiss: 'neutral',
};

const dateTimeLabel = (value: string) => new Date(value).toLocaleString('vi-VN');

export function OperationsLog({ exportable = false }: { exportable?: boolean }) {
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'log', {}],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.log({ limit: 30, cursor: String(pageParam) }, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
    refetchInterval: 30_000,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const columns: DataColumn<LogItem>[] = [
    {
      id: 'created',
      header: copy.created,
      cell: (item) => <span className="whitespace-nowrap">{dateTimeLabel(item.createdAt)}</span>,
    },
    {
      id: 'action',
      header: copy.action,
      cell: (item) => (
        <StatusBadge tone={actionTone[item.action] ?? 'neutral'}>
          {vi.moderation[item.action as 'hide' | 'restore' | 'remove' | 'dismiss'] ?? item.action}
        </StatusBadge>
      ),
    },
    {
      id: 'content',
      header: copy.content,
      cell: (item) => (
        <>
          <span className="block text-text-muted">
            {item.targetType === 'comment' ? copy.comments : copy.posts}
          </span>
          <code className="block max-w-56 truncate font-mono text-xs">{item.commentId ?? item.postId ?? '—'}</code>
        </>
      ),
    },
    {
      id: 'reason',
      header: vi.moderation.reason,
      hideBelow: 'md',
      cell: (item) =>
        vi.moderation.reasons[item.reasonCode as keyof typeof vi.moderation.reasons] ?? item.reasonCode,
    },
    {
      id: 'actor',
      header: vi.moderation.actor,
      hideBelow: 'lg',
      cell: (item) => (
        <>
          <span className="block">{item.actorType === 'system' ? copy.system : copy.staff}</span>
          {item.actorType !== 'system' && (
            <code className="block max-w-48 truncate font-mono text-xs text-text-muted">{item.moderatorId}</code>
          )}
        </>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      {exportable && (
        <div className="flex justify-end">
          <AdminButton disabled={!items.length} onClick={() => exportModerationCsv(items)}>
            {copy.export}
          </AdminButton>
        </div>
      )}
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      <DataTable
        label={exportable ? copy.loadedLog : vi.admin.audit}
        columns={columns}
        rows={items}
        getRowId={(item) => item.id}
        isLoading={query.isPending}
        empty={!query.error && <EmptyState title={copy.empty} description={copy.noActivity} />}
      />
      {items.length > 0 && (
        <LoadMore
          shown={items.length}
          hasMore={!!query.hasNextPage}
          isFetching={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
    </div>
  );
}

export function UnavailableModule({ label }: { label: MessageKey }) {
  return (
    <Panel title={t(label)}>
      <EmptyState title={copy.unavailable} description={copy.unavailableHint} />
      <div className="flex flex-wrap justify-center gap-4 border-t border-border p-4 text-[13px] text-teal-ink">
        <Link href="/moderation">{copy.viewQueue}</Link>
        <Link href="/audit">{copy.viewLog}</Link>
        <Link href="/search-monitor">{copy.checkWorkers}</Link>
      </div>
    </Panel>
  );
}
