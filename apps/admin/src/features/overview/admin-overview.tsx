'use client';
import { useQuery } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { ModerationCaseDto, ModerationLogDto } from '@tripflix/api-client/core-api/model/index';
import { colors } from '@tripflix/tokens';
import { t, vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import Link from 'next/link';
import { AlertRow } from '../live/ops-alerts-page';
import { useDiscoveryJobs, useIndexHealth, useOpsAlerts } from '../live/ops-alerts';
import { useStaffLive } from '../live/staff-live';
import { getRiskLevel } from '../moderation/risk-level';
import { AdminApiError } from '../shell/api-state';
import { formatNumber, formatRelative, shortId } from '../ui/format';
import { Icon } from '../ui/icon';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Skeleton, StatTile, type Tone } from '../ui/primitives';
import { useNow } from '../ui/use-now';
import { MixDonut, QueueTrendChart, ThroughputChart, type ThroughputBucket } from './overview-charts';

const text = vi.adminConsole.overview;
const actionLabels = vi.moderation as unknown as Record<string, string>;
const reasonLabels = vi.moderation.reasons as Record<string, string>;
const HOUR_MS = 3_600_000;
const RISK_TONE: Record<string, Tone> = { critical: 'danger', high: 'coral', medium: 'sun', low: 'teal' };
const ACTION_TONE: Record<string, Tone> = {
  hide: 'coral',
  auto_hide: 'sun',
  remove: 'danger',
  restore: 'teal',
  dismiss: 'neutral',
};

/** Chia thao tác của 24 giờ gần nhất theo giờ, tách nhân sự và hệ thống. */
export function buildThroughput(items: ModerationLogDto[], now: number): ThroughputBucket[] {
  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const buckets = Array.from({ length: 24 }, (_, index) => {
    const start = currentHour - (23 - index) * HOUR_MS;
    return { start, hour: `${new Date(start).getHours()}h`, staff: 0, system: 0 };
  });
  for (const item of items) {
    const index = 23 - Math.floor((currentHour - Math.floor(new Date(item.createdAt).getTime() / HOUR_MS) * HOUR_MS) / HOUR_MS);
    const bucket = buckets[index];
    if (!bucket) continue;
    if (item.actorType === 'system') bucket.system += 1;
    else bucket.staff += 1;
  }
  return buckets.map(({ hour, staff, system }) => ({ hour, staff, system }));
}

export function AdminOverview() {
  const { user } = useApiSession();
  const { stats, samples, feed, pollMs } = useStaffLive();
  const { alerts } = useOpsAlerts();
  const now = useNow();
  const summary = stats.data;

  const priority = useQuery({
    queryKey: ['moderation', 'queue', 'overview-priority'],
    queryFn: ({ signal }) => moderationApi.queue({ view: 'pending', limit: 5 }, signal),
    refetchInterval: pollMs,
  });
  const log = useQuery({
    queryKey: ['moderation', 'log', 'overview'],
    queryFn: ({ signal }) => moderationApi.log({ limit: 100 }, signal),
    refetchInterval: pollMs,
  });
  const logItems = log.data?.items ?? [];
  const throughput = buildThroughput(logItems, now);
  const hasThroughput = throughput.some((bucket) => bucket.staff + bucket.system > 0);
  const actionCounts = Object.entries(
    logItems.reduce<Record<string, number>>((counts, item) => {
      counts[item.action] = (counts[item.action] ?? 0) + 1;
      return counts;
    }, {}),
  ).sort(([, a], [, b]) => b - a);
  const maxAction = Math.max(1, ...actionCounts.map(([, count]) => count));

  const value = (count: number | undefined) => (count === undefined ? '—' : formatNumber(count));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user ? t('adminConsole.overview.greeting', { name: user.displayName }) : text.title}
        subtitle={text.subtitle}
      />
      <AdminApiError error={stats.error} retry={() => void stats.refetch()} />

      <section aria-label={text.title} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label={text.kpiPending}
          icon="inbox"
          tone="navy"
          isLoading={stats.isPending}
          value={value(summary?.pendingTotal)}
          sub={summary && t('adminConsole.overview.kpiPendingSub', { posts: summary.pendingPosts, comments: summary.pendingComments })}
        />
        <StatTile
          label={text.kpiUrgent}
          icon="alert"
          tone="danger"
          isLoading={stats.isPending}
          isHighlighted={!!summary?.pendingUrgent}
          value={value(summary?.pendingUrgent)}
          sub={summary && t('adminConsole.overview.kpiUrgentSub', { severity: summary.urgentSeverity })}
        />
        <StatTile
          label={text.kpiOldest}
          icon="jobs"
          tone="sun"
          isLoading={stats.isPending}
          value={summary?.oldestPendingAt ? formatRelative(summary.oldestPendingAt, now) : '—'}
          sub={summary && !summary.oldestPendingAt ? text.kpiOldestNone : undefined}
        />
        <StatTile
          label={text.kpiAutoHidden}
          icon="shield"
          tone="teal"
          isLoading={stats.isPending}
          value={value(summary?.autoHidden24h)}
          sub={text.kpiAutoHiddenSub}
        />
        <StatTile
          label={text.kpiReports}
          icon="users"
          tone="coral"
          isLoading={stats.isPending}
          value={value(summary?.reports24h)}
          sub={text.kpiReportsSub}
        />
        <StatTile
          label={text.kpiAppeals}
          icon="comment"
          tone="navy"
          isLoading={stats.isPending}
          value={value(summary?.pendingAppeals)}
          sub={summary && summary.failedScans + summary.deferredScans > 0
            ? `${text.kpiScans}: ${summary.failedScans} · ${t('adminConsole.overview.kpiScansSub', { deferred: summary.deferredScans })}`
            : text.kpiAppealsSub}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader
            icon="pulse"
            title={text.queueTrend}
            hint={text.queueTrendHint}
            action={
              <div className="flex items-center gap-3 text-[11px] font-semibold text-text-muted">
                <Legend color="bg-teal" label={text.seriesPending} />
                <Legend color="bg-danger" label={text.seriesUrgent} />
              </div>
            }
          />
          <div className="px-3 pb-3">
            {samples.length > 1 ? (
              <QueueTrendChart points={samples} labels={{ pending: text.seriesPending, urgent: text.seriesUrgent }} />
            ) : (
              <EmptyState icon="pulse" title={text.queueTrendEmpty} className="h-[220px]" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon="overview" title={text.mix} hint={text.mixHint} />
          <div className="px-5 pb-5">
            {summary && summary.pendingTotal > 0 ? (
              <>
                <MixDonut
                  centerValue={formatNumber(summary.pendingTotal)}
                  centerLabel={text.kpiPending}
                  slices={[
                    { name: text.mixPosts, value: summary.pendingPosts, color: colors.navy },
                    { name: text.mixComments, value: summary.pendingComments, color: colors.teal },
                  ]}
                />
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MixStat color="bg-navy" label={text.mixPosts} value={summary.pendingPosts} total={summary.pendingTotal} />
                  <MixStat color="bg-teal" label={text.mixComments} value={summary.pendingComments} total={summary.pendingTotal} />
                </dl>
              </>
            ) : stats.isPending ? (
              <Skeleton className="mx-auto mt-4 size-40 rounded-full" />
            ) : (
              <EmptyState icon="check" title={text.mixEmpty} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="bell"
            title={vi.adminConsole.alerts.title}
            action={
              <Link href="/alerts" className="text-xs font-semibold text-teal-ink hover:underline">
                {text.viewAll}
              </Link>
            }
          />
          {alerts.length ? (
            <ul className="flex flex-col px-2 pb-3">
              {alerts.slice(0, 4).map((alert) => (
                <AlertRow key={alert.id} alert={alert} isCompact />
              ))}
            </ul>
          ) : (
            <EmptyState icon="check" title={vi.adminConsole.alerts.none} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon="shield"
            title={text.priority}
            hint={text.priorityHint}
            action={
              <Link href="/moderation" className="text-xs font-semibold text-teal-ink hover:underline">
                {text.openQueue}
              </Link>
            }
          />
          <AdminApiError error={priority.error} />
          {priority.isPending ? (
            <div className="flex flex-col gap-2 px-5 pb-5">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
          ) : priority.data?.items.length ? (
            <ul className="flex flex-col px-2 pb-3">
              {priority.data.items.map((item) => (
                <PriorityRow key={item.id} item={item} now={now} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="check" title={text.priorityEmpty} />
          )}
        </Card>

        <Card>
          <CardHeader icon="audit" title={text.activity} hint={text.activityHint} />
          {feed.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 px-5 pb-3" aria-label={vi.adminConsole.live.live}>
              {feed.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <Badge tone="teal" hasDot>
                    {vi.adminConsole.live.changed} · {formatRelative(entry.at, now)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <AdminApiError error={log.error} />
          {log.isPending ? (
            <div className="flex flex-col gap-2 px-5 pb-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : logItems.length ? (
            <ol className="relative mx-5 mb-4 border-l border-border">
              {logItems.slice(0, 7).map((item) => (
                <ActivityItem key={item.id} item={item} now={now} />
              ))}
            </ol>
          ) : (
            <EmptyState title={text.activityEmpty} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon="report"
            title={text.throughput}
            hint={text.throughputHint}
            action={
              <div className="flex items-center gap-3 text-[11px] font-semibold text-text-muted">
                <Legend color="bg-navy" label={text.throughputStaff} />
                <Legend color="bg-teal" label={text.throughputSystem} />
              </div>
            }
          />
          <div className="px-3 pb-3">
            {hasThroughput ? (
              <ThroughputChart
                buckets={throughput}
                labels={{ staff: text.throughputStaff, system: text.throughputSystem }}
              />
            ) : (
              <EmptyState icon="report" title={text.throughputEmpty} className="h-[200px]" />
            )}
          </div>
          {actionCounts.length > 0 && (
            <div className="border-t border-border px-5 py-4">
              <h3 className="mb-2 text-xs font-semibold text-text-muted">{text.actionMix}</h3>
              <ul className="flex flex-col gap-2">
                {actionCounts.map(([action, count]) => (
                  <li key={action} className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-3 text-xs">
                    <span className="font-semibold text-text">{actionLabels[action] ?? action}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className={cn('block h-full rounded-full', {
                          'bg-coral': ACTION_TONE[action] === 'coral',
                          'bg-sun': ACTION_TONE[action] === 'sun',
                          'bg-danger': ACTION_TONE[action] === 'danger',
                          'bg-teal': ACTION_TONE[action] === 'teal',
                          'bg-text-subtle': !ACTION_TONE[action] || ACTION_TONE[action] === 'neutral',
                        })}
                        style={{ width: `${(count / maxAction) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <SystemHealthCard now={now} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', color)} aria-hidden="true" />
      {label}
    </span>
  );
}

function MixStat({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <dt className="flex items-center gap-1.5 text-text-muted">
        <span className={cn('size-2 rounded-full', color)} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-0.5 font-bold text-text tabular-nums">
        {formatNumber(value)} <span className="font-normal text-text-muted">· {Math.round((value / total) * 100)}%</span>
      </dd>
    </div>
  );
}

function PriorityRow({ item, now }: { item: ModerationCaseDto; now: number }) {
  const risk = getRiskLevel(item.severity);
  const tone = RISK_TONE[risk.tone] ?? 'neutral';
  return (
    <li>
      <Link
        href={`/moderation?case=${encodeURIComponent(item.id)}`}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface"
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold tabular-nums',
            tone === 'danger' && 'bg-danger/10 text-danger',
            tone === 'coral' && 'bg-coral-tint text-coral-ink',
            tone === 'sun' && 'bg-sun-soft text-ink',
            tone === 'teal' && 'bg-teal-soft text-teal-ink',
          )}
          title={risk.label}
        >
          {item.severity}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">
            {item.targetPreview || `${item.targetType === 'comment' ? vi.moderation.comment : vi.moderation.post} #${shortId(item.targetId)}`}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
            <span>{item.targetType === 'comment' ? vi.moderation.comment : vi.moderation.post}</span>
            {item.reportCount > 0 && <span>· {t('api.reportCount', { count: item.reportCount })}</span>}
            {item.isAutoHidden && <span>· {vi.moderation.autoHidden}</span>}
            <span>· {formatRelative(item.createdAt, now)}</span>
          </span>
        </span>
        <Icon name="chevronRight" size={16} className="text-text-subtle" />
      </Link>
    </li>
  );
}

function ActivityItem({ item, now }: { item: ModerationLogDto; now: number }) {
  const tone = ACTION_TONE[item.action] ?? 'neutral';
  return (
    <li className="relative py-2.5 pl-5">
      <span
        className={cn(
          'absolute top-4 -left-[5px] size-2.5 rounded-full ring-4 ring-background',
          tone === 'coral' && 'bg-coral',
          tone === 'sun' && 'bg-sun',
          tone === 'danger' && 'bg-danger',
          tone === 'teal' && 'bg-teal',
          tone === 'neutral' && 'bg-text-subtle',
        )}
        aria-hidden="true"
      />
      <p className="text-sm text-text">
        <strong className="font-semibold">
          {item.actorType === 'system' ? vi.moderation.system : `${vi.moderation.staff} ${shortId(item.moderatorId)}`}
        </strong>{' '}
        {(actionLabels[item.action] ?? item.action).toLowerCase()}{' '}
        {item.targetType === 'comment' ? vi.moderation.comment.toLowerCase() : vi.moderation.post.toLowerCase()}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">
        {reasonLabels[item.reasonCode] ?? item.reasonCode} · {formatRelative(item.createdAt, now)}
      </p>
    </li>
  );
}

function SystemHealthCard({ now }: { now: number }) {
  const health = useIndexHealth();
  const searchJobs = useDiscoveryJobs('search');
  const recommendJobs = useDiscoveryJobs('recommend');
  const jobs = [...(searchJobs.data?.jobs ?? []), ...(recommendJobs.data?.jobs ?? [])];
  const workerTone: Record<string, Tone> = { healthy: 'teal', attention: 'sun', offline: 'danger', unknown: 'neutral' };
  const outcomeTone: Record<string, Tone> = { running: 'navy', succeeded: 'teal', skipped: 'neutral', failed: 'danger' };
  return (
    <Card>
      <CardHeader icon="search" title={text.health} hint={text.healthHint} />
      <AdminApiError error={health.error ?? searchJobs.error ?? recommendJobs.error} />
      <div className="flex flex-col gap-4 px-5 pb-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-text-muted">{text.workers}</h3>
          {health.isPending ? (
            <Skeleton className="h-10" />
          ) : health.data?.workers.length ? (
            <ul className="flex flex-col gap-1.5">
              {health.data.workers.map((worker) => (
                <li key={worker.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-semibold">{worker.name}</span>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    {formatRelative(worker.lastSeenAt, now)}
                    <Badge tone={workerTone[worker.status] ?? 'neutral'} hasDot>
                      {vi.adminConsole.workerStatus[worker.status]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">{text.noWorkers}</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-text-muted">{text.jobs}</h3>
          <ul className="flex flex-col gap-1.5">
            {jobs.map((job) => {
              const lastRun = job.runs[0];
              return (
                <li key={job.job}>
                  <Link
                    href={job.group === 'search' ? '/search-jobs' : '/recommend-jobs'}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                  >
                    <span className="min-w-0 truncate font-semibold">{vi.discoveryJobs.jobs[job.job]}</span>
                    <span className="flex items-center gap-2 text-xs text-text-muted">
                      {lastRun ? formatRelative(lastRun.startedAt, now) : text.neverRun}
                      {lastRun && (
                        <Badge tone={job.isRunning ? 'navy' : outcomeTone[lastRun.outcome] ?? 'neutral'} hasDot>
                          {vi.adminConsole.jobOutcome[job.isRunning ? 'running' : lastRun.outcome]}
                        </Badge>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
            {!jobs.length && (searchJobs.isPending || recommendJobs.isPending) && <Skeleton className="h-10" />}
          </ul>
        </div>
      </div>
    </Card>
  );
}
