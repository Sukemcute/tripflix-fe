'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { adminIndexHealthControllerCheck } from '@tripflix/api-client/core-api/admin-index-health/admin-index-health';
import { vi } from '@tripflix/i18n';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { MetricStrip } from '@/ui/metric-strip';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState } from '@/ui/states';
import { Panel } from '../shell/operations-ui';
import { SystemSummary } from './system-summary';
import { ThroughputPanel } from './throughput-panel';

const copy = vi.adminOperations;
const QUEUE_HREF = '/moderation?tab=queue';

type QueueItem = NonNullable<Awaited<ReturnType<typeof moderationApi.queue>>>['items'][number];

const workerTone = (status: string): StatusTone =>
  status === 'healthy' ? 'success' : status === 'unknown' ? 'neutral' : 'danger';
const workerLabel = (status: string) =>
  status === 'healthy'
    ? copy.healthy
    : status === 'offline'
      ? copy.workerOffline
      : status === 'attention'
        ? copy.attention
        : copy.unknown;

const viewAll = 'text-xs text-teal-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-teal';

/** Trang đầu: số tổng toàn hệ thống (chỉ superadmin) rồi tới phần kiểm duyệt cho mọi nhân sự. */
export function AdminOverview({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const router = useRouter();
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
  const postShare = summary && summary.pendingTotal > 0 ? (summary.pendingPosts / summary.pendingTotal) * 100 : 0;

  const queueColumns: DataColumn<QueueItem>[] = [
    {
      id: 'content',
      header: copy.content,
      openLabel: (item) => item.targetPreview || item.targetId,
      cell: (item) => (
        <span className="block max-w-md min-w-0">
          <span className="block text-xs text-text-muted">
            {item.targetType === 'post' ? copy.posts : copy.comments} ·{' '}
            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </span>
          <span className="line-clamp-2">{item.targetPreview || item.targetId}</span>
        </span>
      ),
    },
    {
      id: 'priority',
      header: copy.priority,
      cell: (item) => (
        <StatusBadge tone={summary && item.severity >= summary.urgentSeverity ? 'danger' : 'neutral'}>
          {item.severity}/100
        </StatusBadge>
      ),
    },
    { id: 'reports', header: vi.moderation.reportCount, align: 'right', cell: (item) => item.reportCount },
  ];

  return (
    <div className="space-y-6">
      {isSuperadmin && <SystemSummary />}
      <div className="space-y-3">
        {isSuperadmin && <h2 className="text-base font-semibold">{copy.systemSummary.moderationTitle}</h2>}
        <AdminApiError error={stats.error} retry={() => void stats.refetch()} />
        <MetricStrip
          label={copy.snapshot}
          items={[
            {
              id: 'pending',
              label: copy.pending,
              value: summary?.pendingTotal,
              hint: summary ? `${copy.reports}: ${summary.reports24h.toLocaleString('vi-VN')}` : undefined,
              href: QUEUE_HREF,
            },
            { id: 'urgent', label: copy.urgent, value: summary?.pendingUrgent, isUrgent: true, href: QUEUE_HREF },
            { id: 'appeals', label: copy.appeals, value: summary?.pendingAppeals, href: '/moderation?tab=appeals' },
            { id: 'scans', label: copy.scans, value: summary?.failedScans, isUrgent: true, href: '/moderation?tab=scans' },
          ]}
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Panel
          title={copy.queueTitle}
          description={copy.queueHint}
          action={
            <Link className={viewAll} href={QUEUE_HREF}>
              {copy.viewQueue} ↗
            </Link>
          }
        >
          <AdminApiError error={queue.error} retry={() => void queue.refetch()} />
          <DataTable
            label={copy.queueTitle}
            columns={queueColumns}
            rows={queue.data?.items ?? []}
            getRowId={(item) => item.id}
            onRowOpen={() => router.push(QUEUE_HREF)}
            isLoading={queue.isPending}
            loadingRows={5}
            empty={!queue.error && <EmptyState title={copy.noPending} description={copy.noPendingHint} />}
          />
          <dl className="flex flex-wrap justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-text-muted">
            <div className="flex gap-1.5">
              <dt>{copy.autoHidden}:</dt>
              <dd className="tabular-nums">{summary?.autoHidden24h ?? '—'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>{copy.deferred}:</dt>
              <dd className="tabular-nums">{summary?.deferredScans ?? '—'}</dd>
            </div>
          </dl>
        </Panel>

        <div className="space-y-6">
          <Panel title={copy.pendingBreakdown}>
            {stats.isPending ? (
              <LoadingState rows={2} />
            ) : summary && summary.pendingTotal > 0 ? (
              <div className="space-y-3 p-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <span className="bg-navy" style={{ width: `${postShare}%` }} />
                  <span className="bg-teal" style={{ width: `${100 - postShare}%` }} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="h-2 w-2 rounded-full bg-navy" aria-hidden="true" />
                      {copy.posts}
                    </dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {summary.pendingPosts.toLocaleString('vi-VN')}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="h-2 w-2 rounded-full bg-teal" aria-hidden="true" />
                      {copy.comments}
                    </dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {summary.pendingComments.toLocaleString('vi-VN')}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              !stats.isError && <EmptyState title={copy.noPending} />
            )}
          </Panel>

          <Panel
            title={copy.infrastructure}
            action={
              <Link href="/search-monitor" className={viewAll}>
                {copy.checkWorkers} ↗
              </Link>
            }
          >
            <AdminApiError error={health.error} retry={() => void health.refetch()} />
            {health.isPending ? (
              <LoadingState rows={2} />
            ) : !health.data?.workers.length && !health.error ? (
              <EmptyState title={copy.noWorkers} />
            ) : (
              <ul className="divide-y divide-border">
                {health.data?.workers.map((worker) => (
                  <li key={worker.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                    <span className="truncate">{worker.name}</span>
                    <StatusBadge tone={workerTone(worker.status)}>{workerLabel(worker.status)}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={copy.activity}
            action={
              <Link className={viewAll} href="/audit">
                {copy.viewLog} ↗
              </Link>
            }
          >
            <AdminApiError error={log.error} retry={() => void log.refetch()} />
            {log.isPending ? (
              <LoadingState rows={3} />
            ) : !log.data?.items.length && !log.error ? (
              <EmptyState title={copy.noActivity} />
            ) : (
              <ol className="divide-y divide-border">
                {log.data?.items.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-3 px-4 py-2.5 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <p>
                        {vi.moderation[item.action as 'hide' | 'restore' | 'remove' | 'dismiss'] ?? item.action}
                        {' · '}
                        {item.targetType === 'comment' ? copy.comments : copy.posts}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {vi.moderation.reasons[item.reasonCode as keyof typeof vi.moderation.reasons] ??
                          item.reasonCode}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-text-muted tabular-nums" dateTime={item.createdAt}>
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
        </div>
      </div>
      <ThroughputPanel />
    </div>
  );
}
