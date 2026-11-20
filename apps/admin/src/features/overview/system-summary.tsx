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
import { SelectField } from '@/ui/filter-toolbar';
import { MetricStrip, type MetricItem } from '@/ui/metric-strip';
import { formatUsd } from '../ai-usage/ai-usage-range';
import type { AnomalyList } from '../orders/orders-types';
import { AdminApiError } from '../shell/api-state';
import { Panel } from '../shell/operations-ui';
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
    <section className="space-y-3" aria-label={copy.title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{copy.title}</h2>
          <p className="text-[13px] text-text-muted">{copy.description}</p>
        </div>
        <SelectField
          label={copy.range}
          value={String(days)}
          options={SUMMARY_RANGES.map((value) => ({ value: String(value), label: copy.ranges[value] }))}
          onChange={(value) => setDays(Number(value) as SummaryRangeDays)}
        />
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

function Group({
  title,
  href,
  items,
  note,
  children,
}: {
  title: string;
  href: string;
  items: readonly MetricItem[];
  note?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Panel
      title={title}
      action={
        <Link
          className="text-xs text-teal-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-teal-ink"
          href={href}
        >
          {copy.viewDetail} ↗
        </Link>
      }
    >
      {children}
      <MetricStrip label={title} items={items} />
      {note && <p className="border-t border-border px-4 py-2 text-xs text-text-muted">{note}</p>}
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
    <Group
      title={copy.users.title}
      href="/user-activity"
      items={[
        { id: 'active', label: copy.users.activeUsers, value: totals?.activeUsers },
        { id: 'posts', label: copy.users.newPosts, value: totals?.posts },
        { id: 'shares', label: copy.users.shares, value: totals?.shares },
      ]}
      note={<>{copy.users.postsHint} {copy.users.sharesHint}</>}
    >
      <AdminApiError error={overview.error} retry={() => void overview.refetch()} />
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
    <Group
      title={copy.ai.title}
      href="/ai-usage"
      items={[
        { id: 'cost', label: copy.ai.cost, value: total ? formatUsd(total.costUsd) : undefined },
        { id: 'calls', label: copy.ai.calls, value: total?.calls },
        {
          id: 'tokens',
          label: copy.ai.tokens,
          value: total
            ? `${compact.format(total.inputTokens)} / ${compact.format(total.outputTokens)}`
            : undefined,
        },
      ]}
    >
      <AdminApiError error={usage.error} retry={() => void usage.refetch()} />
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
    <Group
      title={copy.system.title}
      href="/analytics"
      items={[
        { id: 'requests', label: copy.system.requests, value: formatRequests(summary?.requests) },
        { id: 'errors', label: copy.system.errorRate, value: formatErrorRate(summary?.errorRate) },
      ]}
      note={<>{copy.system.last24h}</>}
    >
      <AdminApiError error={overview.error} retry={() => void overview.refetch()} />
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
    <Group
      title={copy.orders.title}
      href="/orders"
      items={[
        {
          id: 'anomalies',
          label: copy.orders.anomalies,
          value: anomalies.isError ? undefined : sumAnomalies(anomalies.data?.counts),
          isUrgent: true,
        },
      ]}
      note={<>{copy.orders.current}</>}
    >
      <AdminApiError error={anomalies.error} retry={() => void anomalies.refetch()} />
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
    <Group
      title={copy.jobs.title}
      href="/search-jobs"
      items={[
        {
          id: 'failed',
          label: copy.jobs.failedRuns,
          value: error ? undefined : countFailedRuns([search.data, recommend.data]),
          isUrgent: true,
        },
      ]}
      note={<>{copy.jobs.recent}</>}
    >
      <AdminApiError
        error={error}
        retry={() => {
          void search.refetch();
          void recommend.refetch();
        }}
      />
    </Group>
  );
}
