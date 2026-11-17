'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HttpError } from '@tripflix/api-client';
import {
  observabilityControllerGetOverview,
  observabilityControllerGetTrace,
  observabilityControllerListTraces,
} from '@tripflix/api-client/core-api/analytics/analytics';
import type { TelemetrySourceDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { IconRefresh } from '../shell/admin-icons';
import { MetricChart, formatMetric, formatTime } from './metric-chart';
import styles from './analytics.module.css';

const copy = vi.analytics;
type Range = keyof typeof copy.ranges;
const percent = (value: number | null | undefined) =>
  value == null ? copy.none : `${formatMetric(value * 100, 2)}%`;
const ms = (value: number | null | undefined) =>
  value == null ? copy.none : `${formatMetric(value)} ${copy.milliseconds}`;
const sourceLabel = (status: TelemetrySourceDto['status']) =>
  status === 'ready' ? copy.connected : status === 'unavailable' ? copy.unavailable : copy.notConfigured;

function SourceNotice({
  source,
  kind,
}: {
  source: TelemetrySourceDto | undefined;
  kind: 'metrics' | 'traces';
}) {
  if (!source || source.status === 'ready') return null;
  return (
    <output className={styles.notice}>
      <strong>{sourceLabel(source.status)}</strong>
      <p>
        {source.status === 'not_configured'
          ? kind === 'metrics'
            ? copy.metricsNotConfigured
            : copy.tracesNotConfigured
          : kind === 'metrics'
            ? copy.metricsUnavailable
            : copy.tracesUnavailable}
      </p>
    </output>
  );
}

function TraceDetail({ traceId, onClose }: { traceId: string; onClose: () => void }) {
  const trace = useQuery({
    queryKey: ['analytics', 'trace', traceId],
    queryFn: async ({ signal }) => (await observabilityControllerGetTrace(traceId, { signal })).data,
    retry: false,
  });
  const spans = trace.isError ? [] : (trace.data?.spans ?? []);
  const start = Math.min(...spans.map((span) => span.startedAt));
  const duration = Math.max(...spans.map((span) => span.startedAt + span.durationMs)) - start;
  return (
    <section className={styles.panel} aria-label={copy.detail}>
      <header className={styles.panelHeading}>
        <div>
          <h2>{copy.detail}</h2>
          <code className={styles.traceId}>{traceId}</code>
          <p>
            {spans.length} {copy.spans} · {ms(Number.isFinite(duration) ? duration : null)}
          </p>
        </div>
        <button onClick={onClose} className={styles.button}>
          {copy.close}
        </button>
      </header>
      {trace.isPending && <output className={styles.empty}>{copy.loading}</output>}
      {trace.error instanceof HttpError && trace.error.status === 404 ? (
        <p role="alert" className={styles.empty}>
          {copy.traceNotFound}
        </p>
      ) : (
        <AdminApiError
          error={trace.error}
          retry={() => {
            void trace.refetch();
          }}
        />
      )}
      {!trace.isPending && !trace.isError && !spans.length && <p className={styles.empty}>{copy.noSpans}</p>}
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
    </section>
  );
}

export function AnalyticsWorkspace() {
  const [range, setRange] = useState<Range>('1h');
  const [service, setService] = useState('');
  const [tab, setTab] = useState<'overview' | 'traces'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [minDurationMs, setMinDurationMs] = useState(0);
  const [traceInput, setTraceInput] = useState('');
  const [traceValidation, setTraceValidation] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
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
    queryKey: ['analytics', 'traces', range, service, errorsOnly, minDurationMs],
    enabled: tab === 'traces',
    queryFn: async ({ signal }) =>
      (
        await observabilityControllerListTraces(
          {
            range,
            ...(service ? { service } : {}),
            errorsOnly: errorsOnly ? 'true' : 'false',
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
    setSelectedTrace(id);
  };
  return (
    <div className={styles.root}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <button
          className={styles.refresh}
          onClick={refresh}
          disabled={overview.isFetching || (tab === 'traces' && traces.isFetching)}
        >
          <IconRefresh />
          {copy.refresh}
        </button>
      </header>
      <section className={styles.toolbar} aria-label={copy.filters}>
        <div className={styles.filters}>
          <label>
            {copy.range}
            <select
              aria-label={copy.range}
              value={range}
              onChange={(event) => {
                setRange(event.target.value as Range);
                setSelectedTrace(null);
              }}
            >
              {Object.entries(copy.ranges).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy.service}
            <select
              aria-label={copy.service}
              value={service}
              onChange={(event) => {
                setService(event.target.value);
                setSelectedTrace(null);
              }}
            >
              <option value="">{copy.allServices}</option>
              {serviceNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.refreshState}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            {copy.autoRefresh}
          </label>
          <small aria-live="polite">
            {overview.isFetching
              ? copy.updating
              : overviewData
                ? `${copy.updatedAt} ${formatTime(overviewData.generatedAt)}`
                : copy.none}
          </small>
        </div>
      </section>
      <nav className={styles.tabs} aria-label={copy.title}>
        {(['overview', 'traces'] as const).map((name) => (
          <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>
            {copy[name]}
          </button>
        ))}
      </nav>
      <AdminApiError
        error={overview.error}
        retry={() => {
          void overview.refetch();
        }}
      />
      {overview.isPending && <output>{copy.loading}</output>}
      {tab === 'overview' ? (
        <>
          <SourceNotice source={overviewData?.metricsSource} kind="metrics" />
          <section className={styles.metrics} aria-label={copy.overview}>
            {[
              { label: copy.requests, value: formatMetric(summary?.requests, 0), help: copy.requestsHelp },
              { label: copy.rate, value: formatMetric(summary?.requestRate, 2), help: copy.rateHelp },
              { label: copy.errors, value: percent(summary?.errorRate), help: copy.errorsHelp },
              {
                label: copy.latency,
                value: ms(summary?.p95Ms),
                help: `${copy.latencyHelp} · ${copy.median} ${ms(summary?.p50Ms)}`,
              },
            ].map((metric) => (
              <article className={styles.metric} key={metric.label}>
                <h2>{metric.label}</h2>
                <strong>{metric.value}</strong>
                <p>{metric.help}</p>
              </article>
            ))}
          </section>
          {overviewData?.metricsSource.status === 'ready' && !overviewData.services.length && (
            <div className={styles.notice}>
              <strong>{copy.noData}</strong>
              <p>{copy.warmup}</p>
            </div>
          )}
          <div className={styles.charts}>
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
          <section className={styles.panel}>
            <header className={styles.panelHeading}>
              <div>
                <h2>{copy.servicesTitle}</h2>
                <p>{copy.servicesHelp}</p>
              </div>
              <span className={styles.unit}>OpenTelemetry</span>
            </header>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>{copy.service}</th>
                    <th>{copy.status}</th>
                    <th>{copy.rate}</th>
                    <th>{copy.errors}</th>
                    <th>{copy.latency}</th>
                    <th>{copy.memory}</th>
                    <th>{copy.lastSeen}</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData?.services.map((entry) => (
                    <tr key={entry.name}>
                      <td>
                        <strong>{entry.name}</strong>
                        <small>
                          {copy.uptime}:{' '}
                          {formatMetric(entry.uptimeSeconds === null ? null : entry.uptimeSeconds / 3600)} h
                        </small>
                      </td>
                      <td>
                        <span className={entry.isHealthy ? styles.live : styles.stale}>
                          {entry.isHealthy ? copy.live : copy.stale}
                        </span>
                      </td>
                      <td>{formatMetric(entry.requestRate, 2)}</td>
                      <td>{percent(entry.errorRate)}</td>
                      <td>{ms(entry.p95Ms)}</td>
                      <td>
                        {formatMetric(entry.memoryBytes === null ? null : entry.memoryBytes / 1024 / 1024)}{' '}
                        MiB
                      </td>
                      <td>{entry.lastSeenAt === null ? copy.none : formatTime(entry.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overviewData?.services.length && <p className={styles.empty}>{copy.noData}</p>}
          </section>
          <section className={styles.panel}>
            <header className={styles.panelHeading}>
              <div>
                <h2>{copy.routesTitle}</h2>
                <p>{copy.routesHelp}</p>
              </div>
            </header>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>{copy.route}</th>
                    <th>{copy.service}</th>
                    <th>{copy.requests}</th>
                    <th>{copy.errors}</th>
                    <th>{copy.latency}</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData?.routes.map((entry) => (
                    <tr key={`${entry.service}:${entry.method}:${entry.route}`}>
                      <td>
                        <span className={styles.method}>{entry.method}</span>
                        <code>{entry.route}</code>
                      </td>
                      <td>{entry.service}</td>
                      <td>{formatMetric(entry.requests, 0)}</td>
                      <td>{percent(entry.errorRate)}</td>
                      <td>{ms(entry.p95Ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overviewData?.routes.length && <p className={styles.empty}>{copy.noData}</p>}
          </section>
          <footer className={styles.pipeline}>
            <strong>{copy.pipeline}</strong>
            <p>{copy.pipelineHelp}</p>
            <small>{copy.pipelineNote}</small>
            <span>
              {copy.metricsSource}:{' '}
              {overviewData ? sourceLabel(overviewData.metricsSource.status) : copy.none}
            </span>
          </footer>
        </>
      ) : (
        <>
          <SourceNotice source={tracesData?.source} kind="traces" />
          <section className={styles.panel}>
            <header className={styles.panelHeading}>
              <div>
                <h2>{copy.traceIntro}</h2>
                <p>{copy.traceHelp}</p>
              </div>
              <span className={styles.unit}>Tempo</span>
            </header>
            <div className={styles.traceToolbar}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={errorsOnly}
                  onChange={(event) => setErrorsOnly(event.target.checked)}
                />
                {copy.errorsOnly}
              </label>
              <label>
                {copy.minDuration}
                <select
                  aria-label={copy.minDuration}
                  value={minDurationMs}
                  onChange={(event) => setMinDurationMs(Number(event.target.value))}
                >
                  <option value={0}>{copy.anyDuration}</option>
                  {[100, 500, 1000, 5000].map((value) => (
                    <option key={value} value={value}>
                      {value} {copy.milliseconds}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <form className={styles.lookup} onSubmit={findTrace}>
              <label>
                {copy.findTrace}
                <input
                  value={traceInput}
                  onChange={(event) => setTraceInput(event.target.value)}
                  maxLength={64}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={copy.traceId}
                  aria-invalid={!!traceValidation}
                  aria-describedby={traceValidation ? 'trace-validation' : undefined}
                />
              </label>
              <button className={styles.button} type="submit">
                {copy.openTrace}
              </button>
            </form>
            {traceValidation && (
              <p id="trace-validation" role="alert" className={styles.validation}>
                {traceValidation}
              </p>
            )}
            <AdminApiError
              error={traces.error}
              retry={() => {
                void traces.refetch();
              }}
            />
            {traces.isPending && <output className={styles.empty}>{copy.loading}</output>}
            <div className={`${styles.tableScroll} ${styles.traceTable}`}>
              <table>
                <thead>
                  <tr>
                    <th>{copy.operation}</th>
                    <th>{copy.service}</th>
                    <th>{copy.time}</th>
                    <th>{copy.duration}</th>
                    <th>{copy.traceId}</th>
                  </tr>
                </thead>
                <tbody>
                  {tracesData?.traces.map((entry) => (
                    <tr key={entry.traceId}>
                      <td>
                        <button className={styles.traceLink} onClick={() => setSelectedTrace(entry.traceId)}>
                          {entry.operation || entry.traceId.slice(0, 12)}
                        </button>
                      </td>
                      <td>{entry.service || copy.none}</td>
                      <td>{formatTime(entry.startedAt)}</td>
                      <td className={styles.number}>{ms(entry.durationMs)}</td>
                      <td>
                        <code>{entry.traceId.slice(0, 12)}…</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!traces.isPending && !tracesData?.traces.length && (
              <p className={styles.empty}>{copy.noTraces}</p>
            )}
            {tracesData && tracesData.traces.length >= tracesData.limit && (
              <p className={styles.notice}>{copy.traceLimit}</p>
            )}
          </section>
          {selectedTrace && (
            <TraceDetail key={selectedTrace} traceId={selectedTrace} onClose={() => setSelectedTrace(null)} />
          )}
        </>
      )}
    </div>
  );
}
