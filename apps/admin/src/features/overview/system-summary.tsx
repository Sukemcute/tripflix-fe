'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as adminCommerce from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { adminDiscoveryJobsControllerList } from '@tripflix/api-client/core-api/admin-discovery-jobs/admin-discovery-jobs';
import {
  aiUsageControllerGetAiUsage,
  observabilityControllerGetOverview,
  userActivityControllerOverview,
} from '@tripflix/api-client/core-api/analytics/analytics';
import { vi } from '@tripflix/i18n';
import { AiKpi } from '../ai-usage/ai-kpi';
import { formatUsd } from '../ai-usage/ai-usage-range';
import type { AnomalyList } from '../orders/orders-types';
import { AdminApiError } from '../shell/api-state';
import { Metric, Panel } from '../shell/operations-ui';
import { userActivityRange } from '../user-activity/user-activity-format';
import {
  countFailedRuns,
  formatErrorRate,
  formatRequests,
  SUMMARY_RANGES,
  sumAnomalies,
  type SummaryRangeDays,
} from './system-summary-format';

const copy = vi.adminOperations.systemSummary;
const REFRESH_MS = 60_000;
/** Số lớn rút gọn như tab Chi phí AI (1.9M, 55.2K) để vừa thẻ. */
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Số tổng của từng phần trên trang Tổng quan (SCRUM-181), chỉ superadmin. Mỗi nhóm tải riêng nên một API lỗi
 * không làm trống cả khối; chi tiết xem ở tab tương ứng.
 */
export function SystemSummary() {
  const [days, setDays] = useState<SummaryRangeDays>(7);
  const [openedAt] = useState(() => Date.now());
  const range = userActivityRange(days, openedAt);

  return (
    <section className="space-y-4" aria-label={copy.title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">{copy.title}</h2>
          <p className="text-xs text-text-muted">{copy.description}</p>
        </div>
        <form className="admin-filters" style={{ padding: 0 }} onSubmit={(event) => event.preventDefault()}>
          <label>
            {copy.range}
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value) as SummaryRangeDays)}
            >
              {SUMMARY_RANGES.map((value) => (
                <option key={value} value={value}>
                  {copy.ranges[value]}
                </option>
              ))}
            </select>
          </label>
        </form>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <UsersGroup range={range} />
        <AiGroup range={range} />
        <SystemGroup />
        <div className="grid gap-4 sm:grid-cols-2">
          <OrdersGroup />
          <JobsGroup />
        </div>
      </div>
    </section>
  );
}

function Group({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <Panel
      title={title}
      action={
        <Link className="text-xs font-bold text-teal-ink" href={href}>
          {copy.viewDetail} ↗
        </Link>
      }
    >
      <div className="space-y-3 p-4">{children}</div>
    </Panel>
  );
}

function UsersGroup({ range }: { range: { from: string; to: string } }) {
  const overview = useQuery({
    queryKey: ['admin', 'user-activity', 'overview', range],
    queryFn: async ({ signal }) => (await userActivityControllerOverview(range, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const totals = overview.isError ? undefined : overview.data?.totals;
  return (
    <Group title={copy.users.title} href="/user-activity">
      <AdminApiError error={overview.error} retry={() => void overview.refetch()} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={copy.users.activeUsers} value={totals?.activeUsers} />
        <Metric label={copy.users.newPosts} value={totals?.posts} hint={copy.users.postsHint} />
        <Metric label={copy.users.shares} value={totals?.shares} hint={copy.users.sharesHint} />
      </div>
    </Group>
  );
}

function AiGroup({ range }: { range: { from: string; to: string } }) {
  const usage = useQuery({
    queryKey: ['admin', 'ai-usage', range, 'feature'],
    queryFn: async ({ signal }) =>
      (await aiUsageControllerGetAiUsage({ ...range, groupBy: 'feature' }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const total = usage.isError ? undefined : usage.data?.total;
  return (
    <Group title={copy.ai.title} href="/ai-usage">
      <AdminApiError error={usage.error} retry={() => void usage.refetch()} />
      <div className="grid gap-3 sm:grid-cols-3">
        <AiKpi label={copy.ai.cost} value={total ? formatUsd(total.costUsd) : undefined} />
        <Metric label={copy.ai.calls} value={total?.calls} />
        <AiKpi
          label={copy.ai.tokens}
          value={
            total ? `${compact.format(total.inputTokens)} / ${compact.format(total.outputTokens)}` : undefined
          }
        />
      </div>
    </Group>
  );
}

function SystemGroup() {
  const overview = useQuery({
    queryKey: ['analytics', 'overview', '24h', ''],
    queryFn: async ({ signal }) =>
      (await observabilityControllerGetOverview({ range: '24h' }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const summary = overview.isError ? undefined : overview.data?.summary;
  return (
    <Group title={copy.system.title} href="/analytics">
      <AdminApiError error={overview.error} retry={() => void overview.refetch()} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AiKpi
          label={copy.system.requests}
          value={formatRequests(summary?.requests)}
          hint={copy.system.last24h}
        />
        <AiKpi
          label={copy.system.errorRate}
          value={formatErrorRate(summary?.errorRate)}
          hint={copy.system.last24h}
        />
      </div>
    </Group>
  );
}

function OrdersGroup() {
  const anomalies = useQuery({
    queryKey: ['admin-anomalies'],
    queryFn: async ({ signal }) =>
      (await adminCommerce.adminOrdersControllerAnomalies(undefined, { signal }))
        .data as unknown as AnomalyList,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  return (
    <Group title={copy.orders.title} href="/orders">
      <AdminApiError error={anomalies.error} retry={() => void anomalies.refetch()} />
      <Metric
        label={copy.orders.anomalies}
        value={anomalies.isError ? undefined : sumAnomalies(anomalies.data?.counts)}
        hint={copy.orders.current}
        urgent
      />
    </Group>
  );
}

function JobsGroup() {
  const search = useQuery({
    queryKey: ['admin', 'discovery-jobs', 'search'],
    queryFn: async ({ signal }) =>
      (await adminDiscoveryJobsControllerList({ group: 'search' }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const recommend = useQuery({
    queryKey: ['admin', 'discovery-jobs', 'recommend'],
    queryFn: async ({ signal }) =>
      (await adminDiscoveryJobsControllerList({ group: 'recommend' }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const error = search.error ?? recommend.error;
  return (
    <Group title={copy.jobs.title} href="/search-jobs">
      <AdminApiError
        error={error}
        retry={() => {
          void search.refetch();
          void recommend.refetch();
        }}
      />
      <Metric
        label={copy.jobs.failedRuns}
        value={error ? undefined : countFailedRuns([search.data, recommend.data])}
        hint={copy.jobs.recent}
        urgent
      />
    </Group>
  );
}
