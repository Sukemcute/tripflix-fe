'use client';
import { useQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { adminDiscoveryJobsControllerList } from '@tripflix/api-client/core-api/admin-discovery-jobs/admin-discovery-jobs';
import { adminIndexHealthControllerCheck } from '@tripflix/api-client/core-api/admin-index-health/admin-index-health';
import type { DiscoveryJobDto, IndexWorkerHealthDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { formatDateTime, formatRelative } from '../ui/format';
import type { IconName } from '../ui/icon';
import { useStaffLive } from './staff-live';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface OpsAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  href: string;
  icon: IconName;
}

/** Hồ sơ chờ quá ngưỡng này thì cảnh báo, khớp cam kết xử lý trong ngày. */
export const STALE_PENDING_HOURS = 24;
const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

type ModerationStats = Awaited<ReturnType<typeof moderationApi.stats>>;

/** Gom cảnh báo từ số liệu sẵn có; không có API cảnh báo riêng nên tính ở client từ dữ liệu thật. */
export function buildOpsAlerts(input: {
  stats?: ModerationStats;
  workers?: IndexWorkerHealthDto[];
  jobs?: DiscoveryJobDto[];
  now?: number;
}): OpsAlert[] {
  const { stats, workers = [], jobs = [], now = Date.now() } = input;
  const text = vi.adminConsole.alerts;
  const alerts: OpsAlert[] = [];
  if (stats) {
    if (stats.pendingUrgent > 0)
      alerts.push({
        id: 'urgent',
        severity: 'critical',
        title: t('adminConsole.alerts.urgentTitle', { count: stats.pendingUrgent }),
        body: t('adminConsole.alerts.urgentBody', { severity: stats.urgentSeverity }),
        href: '/moderation',
        icon: 'shield',
      });
    if (stats.oldestPendingAt && now - new Date(stats.oldestPendingAt).getTime() > STALE_PENDING_HOURS * 3_600_000)
      alerts.push({
        id: 'stale',
        severity: 'warning',
        title: t('adminConsole.alerts.staleTitle', { hours: STALE_PENDING_HOURS }),
        body: t('adminConsole.alerts.staleBody', { time: formatRelative(stats.oldestPendingAt, now) }),
        href: '/moderation',
        icon: 'jobs',
      });
    if (stats.failedScans > 0)
      alerts.push({
        id: 'failed-scans',
        severity: 'critical',
        title: t('adminConsole.alerts.scansTitle', { count: stats.failedScans }),
        body: text.scansBody,
        href: '/moderation?tab=scans',
        icon: 'alert',
      });
    if (stats.pendingAppeals > 0)
      alerts.push({
        id: 'appeals',
        severity: 'warning',
        title: t('adminConsole.alerts.appealsTitle', { count: stats.pendingAppeals }),
        body: text.appealsBody,
        href: '/moderation?tab=appeals',
        icon: 'comment',
      });
    if (stats.deferredScans > 0)
      alerts.push({
        id: 'deferred-scans',
        severity: 'info',
        title: t('adminConsole.alerts.deferredTitle', { count: stats.deferredScans }),
        body: text.deferredBody,
        href: '/moderation?tab=scans',
        icon: 'refresh',
      });
  }
  for (const worker of workers) {
    if (worker.status !== 'offline' && worker.status !== 'attention') continue;
    alerts.push({
      id: `worker-${worker.id}`,
      severity: worker.status === 'offline' ? 'critical' : 'warning',
      title: t('adminConsole.alerts.workerTitle', {
        name: worker.name,
        status: vi.adminConsole.workerStatus[worker.status],
      }),
      body: t('adminConsole.alerts.workerBody', { time: formatDateTime(worker.lastSeenAt) }),
      href: '/search-monitor',
      icon: 'search',
    });
  }
  for (const job of jobs) {
    const lastRun = job.runs[0];
    if (lastRun?.outcome !== 'failed') continue;
    alerts.push({
      id: `job-${job.job}`,
      severity: 'warning',
      title: t('adminConsole.alerts.jobTitle', { job: vi.discoveryJobs.jobs[job.job] }),
      body: lastRun.error ?? formatDateTime(lastRun.startedAt),
      href: job.group === 'search' ? '/search-jobs' : '/recommend-jobs',
      icon: 'jobs',
    });
  }
  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

const HEALTH_POLL_MS = 60_000;

export function useIndexHealth() {
  return useQuery({
    queryKey: ['admin', 'search-index-health'],
    queryFn: async ({ signal }) => (await adminIndexHealthControllerCheck({ signal })).data,
    refetchInterval: HEALTH_POLL_MS,
  });
}

export function useDiscoveryJobs(group: 'search' | 'recommend') {
  return useQuery({
    queryKey: ['admin', 'discovery-jobs', group],
    queryFn: async ({ signal }) => (await adminDiscoveryJobsControllerList({ group }, { signal })).data,
    refetchInterval: HEALTH_POLL_MS,
  });
}

export function useOpsAlerts() {
  const { stats } = useStaffLive();
  const health = useIndexHealth();
  const searchJobs = useDiscoveryJobs('search');
  const recommendJobs = useDiscoveryJobs('recommend');
  const alerts = buildOpsAlerts({
    stats: stats.data,
    workers: health.data?.workers,
    jobs: [...(searchJobs.data?.jobs ?? []), ...(recommendJobs.data?.jobs ?? [])],
  });
  return {
    alerts,
    isLoading: stats.isPending,
    errors: [stats.error, health.error, searchJobs.error, recommendJobs.error].filter(Boolean),
  };
}
