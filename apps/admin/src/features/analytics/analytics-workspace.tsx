'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HttpError } from '@tripflix/api-client';
import {
  observabilityControllerGetOverview,
  observabilityControllerGetTrace,
  observabilityControllerListTraces,
} from '@tripflix/api-client/core-api/analytics/analytics';
import type { TelemetrySourceDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { DetailDrawer } from '@/ui/detail-drawer';
import { FilterToolbar, SelectField } from '@/ui/filter-toolbar';
import { TextField } from '@/ui/form-field';
import { RefreshIcon } from '@/ui/icons';
import { MetricStrip } from '@/ui/metric-strip';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { TabPanel, Tabs } from '@/ui/tabs';
import { buildDrawerNavigation, useDetailParam } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
import { Panel } from '../shell/operations-ui';
import { MetricChart, formatMetric, formatTime } from './metric-chart';
import styles from './analytics.module.css';

const copy = vi.analytics;
type Range = keyof typeof copy.ranges;
type TabId = 'overview' | 'traces';
const percent = (value: number | null | undefined) =>
  value == null ? copy.none : `${formatMetric(value * 100, 2)}%`;
const ms = (value: number | null | undefined) =>
  value == null ? copy.none : `${formatMetric(value)} ${copy.milliseconds}`;
const sourceLabel = (status: TelemetrySourceDto['status']) =>
  status === 'ready' ? copy.connected : status === 'unavailable' ? copy.unavailable : copy.notConfigured;

type Overview = NonNullable<Awaited<ReturnType<typeof observabilityControllerGetOverview>>['data']>;
type ServiceRow = Overview['services'][number];
type RouteRow = Overview['routes'][number];
type TraceRow = NonNullable<
  Awaited<ReturnType<typeof observabilityControllerListTraces>>['data']
>['traces'][number];

const checkbox = 'flex items-center gap-2 text-[13px]';
const checkboxInput = 'h-4 w-4 accent-teal-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal';

/** Hộp ghi chú nhỏ cho tình trạng nguồn dữ liệu (chưa cấu hình, mất kết nối, chưa có dữ liệu). */
function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <output className="block rounded-adm border border-border bg-sun-soft px-3 py-2 text-[13px]">
      <strong className="font-semibold">{title}</strong>
      {children && <p className="mt-0.5 text-text-muted">{children}</p>}
    </output>
  );
}

function SourceNotice({
  source,
  kind,
}: {
  source: TelemetrySourceDto | undefined;
  kind: 'metrics' | 'traces';
}) {
  if (!source || source.status === 'ready') return null;
  return (
    <Notice title={sourceLabel(source.status)}>
      {source.status === 'not_configured'
        ? kind === 'metrics'
          ? copy.metricsNotConfigured
          : copy.tracesNotConfigured
        : kind === 'metrics'
          ? copy.metricsUnavailable
          : copy.tracesUnavailable}
    </Notice>
  );
}

function TraceDrawer({
  traceId,
  ids,
  onOpen,
  onClose,
}: {
  traceId: string;
  ids: readonly string[];
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const trace = useQuery({
    queryKey: ['analytics', 'trace', traceId],
    queryFn: async ({ signal }) => (await observabilityControllerGetTrace(traceId, { signal })).data,
    retry: false,
  });
  const spans = trace.isError ? [] : (trace.data?.spans ?? []);
  const start = Math.min(...spans.map((span) => span.startedAt));
  const duration = Math.max(...spans.map((span) => span.startedAt + span.durationMs)) - start;
  return (
    <DetailDrawer
      size="xwide"
      title={copy.detail}
      subtitle={
        <>
          <code className="font-mono">{traceId}</code>
          {spans.length > 0 && ` · ${spans.length} ${copy.spans} · ${ms(Number.isFinite(duration) ? duration : null)}`}
        </>
      }
      navigation={buildDrawerNavigation(ids, traceId, onOpen)}
      scrollKey={traceId}
      onClose={onClose}
    >
      {trace.isPending && <LoadingState />}
      {trace.error instanceof HttpError && trace.error.status === 404 ? (
        <EmptyState title={copy.traceNotFound} />
      ) : (
        <AdminApiError
          error={trace.error}
          retry={() => {
            void trace.refetch();
          }}
        />
      )}
      {!trace.isPending && !trace.isError && !spans.length && <EmptyState title={copy.noSpans} />}
      {spans.length > 0 && (
        <div className={styles.waterfall}>
          {spans.map((span) => (
            <div className={styles.spanRow} key={span.spanId}>
              <div>
                <strong>{span.operation}</strong>
                <small>
                  {span.service} ·{' '}
                  {span.httpStatus !== null
                    ? `${copy.httpStatus} ${span.httpStatus}`
                    : span.isError
                      ? copy.spanError
                      : copy.spanOk}
                </small>
                <code>{span.spanId}</code>
              </div>
              <div className={styles.spanTrack} aria-label={`${span.operation}: ${ms(span.durationMs)}`}>
                <span
                  className={span.isError ? styles.errorBar : styles.spanBar}
                  style={{
                    marginLeft: `${((span.startedAt - start) / Math.max(duration, 1)) * 99}%`,
                    width: `${Math.max(0.5, (span.durationMs / Math.max(duration, 1)) * 99)}%`,
                  }}
                />
              </div>
              <span className={styles.number}>{ms(span.durationMs)}</span>
            </div>
          ))}
        </div>
      )}
    </DetailDrawer>
  );
}

const serviceColumns: DataColumn<ServiceRow>[] = [
  {
    id: 'service',
    header: copy.service,
    cell: (entry) => (
      <span className="block">
        <span className="block">{entry.name}</span>
        <span className="block text-xs text-text-muted">
          {copy.uptime}: {formatMetric(entry.uptimeSeconds === null ? null : entry.uptimeSeconds / 3600)} h
        </span>
      </span>
    ),
  },
  {
    id: 'status',
    header: copy.status,
    cell: (entry) => (
      <StatusBadge tone={entry.isHealthy ? 'success' : 'danger'}>
        {entry.isHealthy ? copy.live : copy.stale}
      </StatusBadge>
    ),
  },
  { id: 'rate', header: copy.rate, align: 'right', cell: (entry) => formatMetric(entry.requestRate, 2) },
  { id: 'errors', header: copy.errors, align: 'right', cell: (entry) => percent(entry.errorRate) },
  { id: 'latency', header: copy.latency, align: 'right', cell: (entry) => ms(entry.p95Ms) },
  {
    id: 'memory',
    header: copy.memory,
    align: 'right',
    hideBelow: 'md',
    cell: (entry) =>
      `${formatMetric(entry.memoryBytes === null ? null : entry.memoryBytes / 1024 / 1024)} MiB`,
  },
  {
    id: 'lastSeen',
    header: copy.lastSeen,
    hideBelow: 'lg',
    cell: (entry) => (entry.lastSeenAt === null ? copy.none : formatTime(entry.lastSeenAt)),
  },
];

const routeColumns: DataColumn<RouteRow>[] = [
  {
    id: 'route',
    header: copy.route,
    cell: (entry) => (
      <span className="block break-all">
        <span className={styles.method}>{entry.method}</span>
        <code className={styles.mono}>{entry.route}</code>
      </span>
    ),
  },
  { id: 'service', header: copy.service, hideBelow: 'sm', cell: (entry) => entry.service },
  { id: 'requests', header: copy.requests, align: 'right', cell: (entry) => formatMetric(entry.requests, 0) },
  { id: 'errors', header: copy.errors, align: 'right', cell: (entry) => percent(entry.errorRate) },
  { id: 'latency', header: copy.latency, align: 'right', cell: (entry) => ms(entry.p95Ms) },
];

const traceColumns: DataColumn<TraceRow>[] = [
  {
    id: 'operation',
    header: copy.operation,
    openLabel: (entry) => entry.operation || entry.traceId.slice(0, 12),
    cell: (entry) => entry.operation || entry.traceId.slice(0, 12),
  },
  { id: 'service', header: copy.service, hideBelow: 'sm', cell: (entry) => entry.service || copy.none },
  { id: 'time', header: copy.time, hideBelow: 'md', cell: (entry) => formatTime(entry.startedAt) },
  { id: 'duration', header: copy.duration, align: 'right', cell: (entry) => ms(entry.durationMs) },
  {
    id: 'traceId',
    header: copy.traceId,
    hideBelow: 'lg',
    cell: (entry) => <code className={styles.mono}>{entry.traceId.slice(0, 12)}…</code>,
  },
];

export function AnalyticsWorkspace() {
  const [range, setRange] = useState<Range>('1h');
  const [service, setService] = useState('');
  const [tab, setTab] = useState<TabId>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [includeSuccessfulPreflights, setIncludeSuccessfulPreflights] = useState(false);
  const [minDurationMs, setMinDurationMs] = useState(0);
  const [traceInput, setTraceInput] = useState('');
  const [traceValidation, setTraceValidation] = useState('');
  const {
    openId: selectedTrace,
    open: openTrace,
    close: closeTrace,
    clear: clearTrace,
  } = useDetailParam();
  const interval = autoRefresh ? 30_000 : false;
  const overview = useQuery({
    queryKey: ['analytics', 'overview', range, service],
    queryFn: async ({ signal }) =>
      (await observabilityControllerGetOverview({ range, ...(service ? { service } : {}) }, { signal })).data,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
    retry: false,
  });
  // Keep the service picker complete when the main query is narrowed to one service.
  const catalog = useQuery({
    queryKey: ['analytics', 'overview', range, ''],
    enabled: !!service,
    queryFn: async ({ signal }) => (await observabilityControllerGetOverview({ range }, { signal })).data,
    refetchInterval: interval,
    retry: false,
  });
  const traces = useQuery({
    queryKey: ['analytics', 'traces', range, service, errorsOnly, minDurationMs, includeSuccessfulPreflights],
    enabled: tab === 'traces',
    queryFn: async ({ signal }) =>
      (
        await observabilityControllerListTraces(
          {
            range,
            ...(service ? { service } : {}),
            errorsOnly: errorsOnly ? 'true' : 'false',
            includeSuccessfulPreflights: includeSuccessfulPreflights ? 'true' : 'false',
            minDurationMs,
          },
          { signal },
        )
      ).data,
    refetchInterval: tab === 'traces' ? interval : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const overviewData = overview.isError ? undefined : overview.data;
  const tracesData = traces.isError ? undefined : traces.data;
  const summary = overviewData?.summary;
  const serviceNames = [
    ...new Set([
      ...(service ? (catalog.data?.services ?? []) : (overviewData?.services ?? [])).map(
        (entry) => entry.name,
      ),
      ...(service ? [service] : []),
    ]),
  ].sort();
  const refresh = () => {
    void overview.refetch();
    if (tab === 'traces') void traces.refetch();
    if (service) void catalog.refetch();
  };
  const findTrace = (event: FormEvent) => {
    event.preventDefault();
    const id = traceInput.trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(id)) {
      setTraceValidation(copy.invalidTraceId);
      return;
    }
    setTraceValidation('');
    openTrace(id);
  };
  const isRefreshing = overview.isFetching || (tab === 'traces' && traces.isFetching);
  return (
    <div className="space-y-4">
      <FilterToolbar
        summary={
          overview.isFetching
            ? copy.updating
            : overviewData
              ? `${copy.updatedAt} ${formatTime(overviewData.generatedAt)}`
              : copy.none
        }
        actions={
          <AdminButton onClick={refresh} disabled={isRefreshing}>
            <RefreshIcon width={14} height={14} />
            {copy.refresh}
          </AdminButton>
        }
      >
        <SelectField
          label={copy.range}
          value={range}
          options={Object.entries(copy.ranges).map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            setRange(value as Range);
            clearTrace();
          }}
        />
        <SelectField
          label={copy.service}
          value={service}
          allLabel={copy.allServices}
          options={serviceNames.map((name) => ({ value: name, label: name }))}
          onChange={(value) => {
            setService(value);
            clearTrace();
          }}
        />
        <label className={checkbox}>
          <input
            type="checkbox"
            className={checkboxInput}
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          {copy.autoRefresh}
        </label>
      </FilterToolbar>
      <Tabs
        label={copy.title}
        idPrefix="analytics"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: copy.overview },
          { id: 'traces', label: copy.traces },
        ]}
      />
      <AdminApiError
        error={overview.error}
        retry={() => {
          void overview.refetch();
        }}
      />
      {overview.isPending && <LoadingState />}
      <TabPanel idPrefix="analytics" active={tab}>
        {tab === 'overview' ? (
          <div className="space-y-4">
            <SourceNotice source={overviewData?.metricsSource} kind="metrics" />
            <MetricStrip
              label={copy.overview}
              items={[
                {
                  id: 'requests',
                  label: copy.requests,
                  value: formatMetric(summary?.requests, 0),
                  hint: copy.requestsHelp,
                },
                { id: 'rate', label: copy.rate, value: formatMetric(summary?.requestRate, 2), hint: copy.rateHelp },
                { id: 'errors', label: copy.errors, value: percent(summary?.errorRate), hint: copy.errorsHelp },
                {
                  id: 'latency',
                  label: copy.latency,
                  value: ms(summary?.p95Ms),
                  hint: `${copy.latencyHelp} · ${copy.median} ${ms(summary?.p50Ms)}`,
                },
              ]}
            />
            {overviewData?.metricsSource.status === 'ready' && !overviewData.services.length && (
              <Notice title={copy.noData}>{copy.warmup}</Notice>
            )}
            <div className="grid gap-4 xl:grid-cols-2">
              <MetricChart
                points={overviewData?.series ?? []}
                field="requestRate"
                title={copy.traffic}
                description={copy.trafficHelp}
                unit={copy.perSecond}
              />
              <MetricChart
                points={overviewData?.series ?? []}
                field="p95Ms"
                title={copy.latencyChart}
                description={copy.latencyChartHelp}
                unit={copy.milliseconds}
              />
            </div>
            <Panel title={copy.servicesTitle} description={copy.servicesHelp}>
              <DataTable
                label={copy.servicesTitle}
                columns={serviceColumns}
                rows={overviewData?.services ?? []}
                getRowId={(entry) => entry.name}
                empty={<EmptyState title={copy.noData} />}
              />
            </Panel>
            <Panel title={copy.routesTitle} description={copy.routesHelp}>
              <DataTable
                label={copy.routesTitle}
                columns={routeColumns}
                rows={overviewData?.routes ?? []}
                getRowId={(entry) => `${entry.service}:${entry.method}:${entry.route}`}
                empty={<EmptyState title={copy.noData} />}
              />
            </Panel>
            <p className="text-xs text-text-muted">
              <strong className="font-semibold text-ink">{copy.pipeline}</strong> · {copy.pipelineHelp}{' '}
              {copy.pipelineNote} {copy.metricsSource}:{' '}
              {overviewData ? sourceLabel(overviewData.metricsSource.status) : copy.none}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <SourceNotice source={tracesData?.source} kind="traces" />
            <Panel title={copy.traceIntro} description={copy.traceHelp}>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-border px-4 py-3">
                <label className={checkbox}>
                  <input
                    type="checkbox"
                    className={checkboxInput}
                    checked={errorsOnly}
                    onChange={(event) => setErrorsOnly(event.target.checked)}
                  />
                  {copy.errorsOnly}
                </label>
                <label className={checkbox} title={copy.preflightHelp}>
                  <input
                    type="checkbox"
                    className={checkboxInput}
                    checked={includeSuccessfulPreflights}
                    onChange={(event) => setIncludeSuccessfulPreflights(event.target.checked)}
                  />
                  {copy.includeSuccessfulPreflights}
                </label>
                <SelectField
                  label={copy.minDuration}
                  value={String(minDurationMs)}
                  options={[
                    { value: '0', label: copy.anyDuration },
                    ...[100, 500, 1000, 5000].map((value) => ({
                      value: String(value),
                      label: `${value} ${copy.milliseconds}`,
                    })),
                  ]}
                  onChange={(value) => setMinDurationMs(Number(value))}
                />
                <form className="ml-auto flex items-end gap-2" onSubmit={findTrace}>
                  <TextField
                    label={copy.findTrace}
                    value={traceInput}
                    onChange={(event) => setTraceInput(event.target.value)}
                    maxLength={64}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={copy.traceId}
                    error={traceValidation || undefined}
                    className="w-72"
                  />
                  <AdminButton type="submit" size="lg">
                    {copy.openTrace}
                  </AdminButton>
                </form>
              </div>
              <AdminApiError
                error={traces.error}
                retry={() => {
                  void traces.refetch();
                }}
              />
              <DataTable
                label={copy.traceIntro}
                columns={traceColumns}
                rows={tracesData?.traces ?? []}
                getRowId={(entry) => entry.traceId}
                onRowOpen={(entry) => openTrace(entry.traceId)}
                selectedId={selectedTrace}
                isLoading={traces.isPending}
                empty={!traces.error && <EmptyState title={copy.noTraces} />}
              />
              {tracesData && tracesData.traces.length >= tracesData.limit && (
                <p className="border-t border-border px-4 py-2 text-xs text-text-muted">{copy.traceLimit}</p>
              )}
            </Panel>
          </div>
        )}
      </TabPanel>
      {tab === 'traces' && selectedTrace && (
        <TraceDrawer
          traceId={selectedTrace}
          ids={tracesData?.traces.map((entry) => entry.traceId) ?? []}
          onOpen={openTrace}
          onClose={closeTrace}
        />
      )}
    </div>
  );
}
