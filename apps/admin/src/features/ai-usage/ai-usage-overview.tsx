'use client';

import { useQuery } from '@tanstack/react-query';
import {
  aiInsightsControllerTimeseries,
  aiInsightsControllerUsers,
  aiUsageControllerGetAiUsage,
} from '@tripflix/api-client/core-api/analytics/analytics';
import type { AiUsageControllerGetAiUsageGroupBy } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { SelectField } from '@/ui/filter-toolbar';
import { MetricStrip } from '@/ui/metric-strip';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Panel } from '../shell/operations-ui';
import { bucketFor, count, formatBucketLabel } from './ai-usage-format';
import { formatUsd } from './ai-usage-range';

const copy = vi.aiUsage;
const GROUPS = Object.keys(copy.groups) as AiUsageControllerGetAiUsageGroupBy[];
const REFRESH_MS = 30_000;
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Tên nhóm cho người đọc: tính năng dịch sang tiếng Việt, ngày và model giữ nguyên. */
const groupLabel = (groupBy: AiUsageControllerGetAiUsageGroupBy, key: string) =>
  groupBy === 'feature' ? (copy.features[key as keyof typeof copy.features] ?? key) : key;

const axisProps = { fontSize: 10, stroke: 'var(--color-text-muted)', tickLine: false } as const;

/** Tổng quan chi phí AI: thẻ số liệu, lưu lượng theo thời gian và bảng theo tính năng, ngày, model. */
export function AiUsageOverview({ range, days }: { range: { from: string; to: string }; days: number }) {
  const [groupBy, setGroupBy] = useState<AiUsageControllerGetAiUsageGroupBy>('feature');
  const bucket = bucketFor(days);

  const usage = useQuery({
    queryKey: ['admin', 'ai-usage', range, groupBy],
    queryFn: async ({ signal }) =>
      (await aiUsageControllerGetAiUsage({ ...range, groupBy }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const series = useQuery({
    queryKey: ['admin', 'ai-usage', 'timeseries', range, bucket],
    queryFn: async ({ signal }) =>
      (await aiInsightsControllerTimeseries({ ...range, bucket }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });
  const users = useQuery({
    queryKey: ['admin', 'ai-usage', 'users-total', range],
    queryFn: async ({ signal }) =>
      (await aiInsightsControllerUsers({ ...range, page: 1, pageSize: 1 }, { signal })).data,
    refetchInterval: REFRESH_MS,
    retry: false,
  });

  const total = usage.isError ? undefined : usage.data?.total;
  const points = series.isError ? [] : (series.data?.points ?? []);
  const chart = points.map((point) => ({ ...point, label: formatBucketLabel(point.at, bucket) }));
  const hasTraffic = points.some((point) => point.calls > 0);

  return (
    <div className="space-y-6">
      <MetricStrip
        label={copy.title}
        items={[
          { id: 'cost', label: copy.kpi.cost, value: total ? formatUsd(total.costUsd) : undefined },
          { id: 'calls', label: copy.kpi.calls, value: total ? count.format(total.calls) : undefined },
          { id: 'in', label: copy.kpi.inputTokens, value: total ? compact.format(total.inputTokens) : undefined },
          { id: 'out', label: copy.kpi.outputTokens, value: total ? compact.format(total.outputTokens) : undefined },
          { id: 'users', label: copy.kpi.users, value: users.data ? count.format(users.data.total) : undefined },
          {
            id: 'unpriced',
            label: copy.kpi.unpricedCalls,
            value: total ? count.format(total.unpricedCalls ?? 0) : undefined,
            hint: total?.unpricedCalls ? 'Chi phí thực cần đối chiếu nhà cung cấp.' : undefined,
          },
        ]}
      />

      {series.isError && <AdminApiError error={series.error} retry={() => void series.refetch()} />}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={copy.charts.tokens}>
          {series.isPending ? (
            <LoadingState />
          ) : !hasTraffic ? (
            <EmptyState title={copy.charts.empty} />
          ) : (
            <div className="h-64 w-full p-4" aria-label={copy.charts.tokens}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis
                    {...axisProps}
                    axisLine={false}
                    tickFormatter={(value: number) => compact.format(value)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface)' }}
                    formatter={(value) => count.format(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="inputTokens"
                    name={copy.charts.input}
                    stackId="tokens"
                    fill="var(--color-navy)"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="outputTokens"
                    name={copy.charts.output}
                    stackId="tokens"
                    fill="var(--color-teal)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel title={copy.charts.cost}>
          {series.isPending ? (
            <LoadingState />
          ) : !hasTraffic ? (
            <EmptyState title={copy.charts.empty} />
          ) : (
            <div className="h-64 w-full p-4" aria-label={copy.charts.cost}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis
                    {...axisProps}
                    axisLine={false}
                    tickFormatter={(value: number) => formatUsd(value)}
                    width={64}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface)' }}
                    formatter={(value) => formatUsd(Number(value))}
                  />
                  <Bar
                    dataKey="costUsd"
                    name={copy.charts.costSeries}
                    fill="var(--color-warning)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title={copy.byGroup}
        action={
          <SelectField
            label={copy.groupBy}
            value={groupBy}
            options={GROUPS.map((value) => ({ value, label: copy.groups[value] }))}
            onChange={(value) => setGroupBy(value as AiUsageControllerGetAiUsageGroupBy)}
          />
        }
      >
        {usage.isError && <AdminApiError error={usage.error} retry={() => void usage.refetch()} />}
        {usage.isPending ? (
          <LoadingState />
        ) : usage.data && usage.data.rows.length > 0 ? (
          <div className="admin-table-scroll">
            <table className="ops-table" aria-label={copy.byGroup}>
              <thead>
                <tr>
                  <th scope="col">{copy.groups[groupBy]}</th>
                  <th scope="col">{copy.columns.calls}</th>
                  <th scope="col">{copy.columns.inputTokens}</th>
                  <th scope="col">{copy.columns.outputTokens}</th>
                  <th scope="col">{copy.columns.costUsd}</th>
                  <th scope="col">{copy.columns.unpricedCalls}</th>
                </tr>
              </thead>
              <tbody>
                {usage.data.rows.map((row) => (
                  <tr key={row.key}>
                    <td className="font-semibold text-navy">{groupLabel(groupBy, row.key)}</td>
                    <td className="tabular-nums">{count.format(row.calls)}</td>
                    <td className="tabular-nums">{count.format(row.inputTokens)}</td>
                    <td className="tabular-nums">{count.format(row.outputTokens)}</td>
                    <td className="tabular-nums">{formatUsd(row.costUsd)}</td>
                    <td className="tabular-nums">{count.format(row.unpricedCalls ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{copy.total}</th>
                  <td className="tabular-nums">{count.format(usage.data.total.calls)}</td>
                  <td className="tabular-nums">{count.format(usage.data.total.inputTokens)}</td>
                  <td className="tabular-nums">{count.format(usage.data.total.outputTokens)}</td>
                  <td className="tabular-nums">{formatUsd(usage.data.total.costUsd)}</td>
                  <td className="tabular-nums">{count.format(usage.data.total.unpricedCalls ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          !usage.isError && <EmptyState title={copy.empty} />
        )}
        <p className="px-5 pb-4 text-xs text-text-muted">{copy.estimated}</p>
      </Panel>
    </div>
  );
}
