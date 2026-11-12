'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG charts require an image role for their accessible titles. */

import { useState } from 'react';
import type { IndexHealthDto, IndexHealthPointDtoStatus } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import styles from './search-monitoring.module.css';

const copy = vi.searchMonitoring.workers;
const text = copy.monitor;
const statuses: IndexHealthPointDtoStatus[] = ['healthy', 'attention', 'offline', 'unknown'];
const time = (at: number) =>
  new Date(at).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
const windowMs = 2 * 60 * 60_000;

export function WorkerMonitorCharts({ data }: { data: IndexHealthDto }) {
  const [selected, setSelected] = useState(23);
  const [metric, setMetric] = useState<'durationMs' | 'count'>('durationMs');
  const workers = data.workers;
  const points = workers[0]?.history ?? [];
  const runs = workers
    .flatMap((worker) =>
      worker.jobs.flatMap((job) =>
        (job.logs ?? [])
          .filter((entry) => entry.outcome != null)
          .map((entry) => ({
            ...entry,
            job: job.job,
            worker: worker.name,
          })),
      ),
    )
    .sort((a, b) => a.at - b.at);
  const succeeded = runs.filter((run) => run.outcome === 'succeeded').length;
  const failed = runs.filter((run) => run.outcome === 'failed').length;
  const skipped = runs.filter((run) => run.outcome === 'skipped').length;
  const rate = succeeded + failed ? Math.round((succeeded / (succeeded + failed)) * 100) : null;
  const active = workers.filter((worker) => ['healthy', 'attention'].includes(worker.status)).length;
  const offline = workers.filter((worker) => worker.status === 'offline').length;
  const issues = workers
    .flatMap((worker) => worker.jobs)
    .filter((job) => ['failed', 'stuck', 'overdue'].includes(job.status)).length;
  const plotted = runs.filter((run) => run[metric] !== null && run[metric] !== undefined);
  const maximum = Math.max(1, ...plotted.map((run) => run[metric] ?? 0));
  const x = (at: number) => 52 + ((at - (data.checkedAt - windowMs)) / windowMs) * 476;
  const y = (value: number) => 170 - (value / maximum) * 130;
  const workerMaximum = Math.max(1, workers.length);
  const selectedAt = points[selected]?.at;
  const summary = [
    { label: text.active, value: active, status: 'healthy' },
    { label: text.offline, value: offline, status: offline ? 'offline' : 'unknown' },
    { label: text.issues, value: issues, status: issues ? 'attention' : 'healthy' },
    { label: text.completed, value: runs.length, status: 'unknown' },
  ];

  return (
    <div className={styles.monitor}>
      <div className={styles.monitorMetrics} aria-label={text.overview}>
        {summary.map(({ label, value, status }) => (
          <div key={label}>
            <span>
              <i className={styles.healthPoint} data-status={status} />
              {label}
            </span>
            <strong>{value.toLocaleString('vi-VN')}</strong>
          </div>
        ))}
      </div>
      <div className={styles.monitorCharts}>
        <section className={styles.panel} aria-label={text.availability}>
          <h3>{text.availability}</h3>
          <p>{text.availabilityUnit}</p>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG chart exposes an accessible title. */}
          <svg className={styles.monitorSvg} viewBox="0 0 560 210" role="img" aria-label={text.availability}>
            <title>{text.availability}</title>
            {[0, 0.5, 1].map((ratio) => (
              <g key={ratio}>
                <line
                  x1="52"
                  x2="528"
                  y1={170 - ratio * 130}
                  y2={170 - ratio * 130}
                  className={styles.chartGrid}
                />
                <text x="42" y={174 - ratio * 130} textAnchor="end">
                  {Number((workerMaximum * ratio).toFixed(1))}
                </text>
              </g>
            ))}
            {points.map((point, index) => {
              const buckets = statuses.map((status) => ({
                status,
                count: workers.filter((worker) => worker.history[index]?.status === status).length,
              }));
              return (
                <g key={point.at}>
                  {buckets.map(({ status, count }, bucketIndex) => {
                    const height = (count / workerMaximum) * 130;
                    const stacked = buckets
                      .slice(0, bucketIndex + 1)
                      .reduce((sum, bucket) => sum + bucket.count, 0);
                    return (
                      <rect
                        key={status}
                        x={55 + index * 19.7}
                        y={170 - (stacked / workerMaximum) * 130}
                        width="14"
                        height={height}
                        className={styles.healthPoint}
                        data-status={status}
                      >
                        <title>
                          {time(point.at)} · {copy.healthStatus[status]} · {count}
                        </title>
                      </rect>
                    );
                  })}
                </g>
              );
            })}
            <text x="52" y="200">
              {time(data.checkedAt - windowMs)}
            </text>
            <text x="528" y="200" textAnchor="end">
              {time(data.checkedAt)}
            </text>
          </svg>
          <div className={styles.trendLegend}>
            {statuses.map((status) => (
              <span key={status}>
                <i className={styles.healthPoint} data-status={status} />
                {copy.healthStatus[status]}
              </span>
            ))}
          </div>
        </section>
        <section
          className={styles.panel}
          aria-label={metric === 'durationMs' ? text.duration : text.documents}
        >
          <div className={styles.monitorChartHeading}>
            <h3>{metric === 'durationMs' ? text.duration : text.documents}</h3>
            <div className={styles.monitorToggle}>
              <button
                type="button"
                aria-pressed={metric === 'durationMs'}
                onClick={() => setMetric('durationMs')}
              >
                {text.duration}
              </button>
              <button type="button" aria-pressed={metric === 'count'} onClick={() => setMetric('count')}>
                {text.documents}
              </button>
            </div>
          </div>
          <p>{metric === 'durationMs' ? text.durationUnit : text.documentsUnit}</p>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG chart exposes an accessible title. */}
          <svg
            className={styles.monitorSvg}
            viewBox="0 0 560 210"
            role="img"
            aria-label={metric === 'durationMs' ? text.duration : text.documents}
          >
            <title>{metric === 'durationMs' ? text.duration : text.documents}</title>
            {[0, 0.5, 1].map((ratio) => (
              <g key={ratio}>
                <line
                  x1="52"
                  x2="528"
                  y1={y(maximum * ratio)}
                  y2={y(maximum * ratio)}
                  className={styles.chartGrid}
                />
                <text x="42" y={y(maximum * ratio) + 4} textAnchor="end">
                  {(maximum * ratio).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
                </text>
              </g>
            ))}
            {(['explore', 'suggest'] as const).map((job) => {
              const samples = plotted.filter((run) => run.job === job);
              return (
                <g key={job} className={styles.runSeries} data-job={job}>
                  <path
                    d={samples
                      .map((run, index) => `${index ? 'L' : 'M'}${x(run.at)},${y(run[metric]!)}`)
                      .join(' ')}
                  />
                  {samples.map((run, index) => (
                    <circle
                      key={`${run.at}-${index}`}
                      cx={x(run.at)}
                      cy={y(run[metric]!)}
                      r="4"
                      data-outcome={run.outcome}
                    >
                      <title>
                        {time(run.at)} · {text[job]} · {run[metric]}{' '}
                        {metric === 'durationMs' ? 'ms' : text.documents} · {copy.jobStatus[run.outcome!]} ·{' '}
                        {run.worker}
                      </title>
                    </circle>
                  ))}
                </g>
              );
            })}
            <text x="52" y="200">
              {time(data.checkedAt - windowMs)}
            </text>
            <text x="528" y="200" textAnchor="end">
              {time(data.checkedAt)}
            </text>
          </svg>
          <div className={styles.trendLegend}>
            <span>
              <i className={styles.exploreSwatch} />
              {text.explore}
            </span>
            <span>
              <i className={styles.suggestSwatch} />
              {text.suggest}
            </span>
            {!plotted.length && <span>{text.noValues}</span>}
          </div>
          {plotted.length === 1 && <p>{text.onePoint}</p>}
        </section>
      </div>
      <div className={styles.monitorBottom}>
        <section className={styles.panel} aria-label={text.heatmap}>
          <div className={styles.resultHeading}>
            <h3>{text.heatmap}</h3>
            <span className={styles.monitorSelection}>
              {text.selected} · {selectedAt ? time(selectedAt) : '—'}
            </span>
          </div>
          <p>{text.window}</p>
          <div className={styles.monitorMatrix}>
            {workers.map((worker) => (
              <div key={worker.id} className={styles.monitorMatrixRow}>
                <a href={`#worker-${worker.id}`} title={worker.name}>
                  {worker.name} <small>{worker.id.slice(0, 8)}</small>
                </a>
                <div>
                  {worker.history.map((point, index) => (
                    <button
                      key={point.at}
                      type="button"
                      className={styles.healthPoint}
                      data-status={point.status}
                      aria-pressed={selected === index}
                      onClick={() => setSelected(index)}
                      aria-label={`${worker.name} · ${time(point.at)} · ${copy.healthStatus[point.status]}`}
                      title={`${time(point.at)} · ${copy.healthStatus[point.status]}`}
                    />
                  ))}
                </div>
                <span
                  className={styles.healthBadge}
                  data-status={worker.history[selected]?.status ?? 'unknown'}
                >
                  {copy.healthStatus[worker.history[selected]?.status ?? 'unknown']}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.healthAxis}>
            <span>{time(data.checkedAt - windowMs)}</span>
            <span>{time(data.checkedAt)}</span>
          </div>
          <p className={styles.monitorFootnote}>{text.workerScope}</p>
        </section>
        <section className={styles.panel} aria-label={text.outcomes}>
          <h3>{text.outcomes}</h3>
          <div
            className={styles.outcomeRing}
            style={{
              background: runs.length
                ? `conic-gradient(var(--color-teal-ink) 0 ${(succeeded / runs.length) * 100}%, var(--color-coral-ink) 0 ${((succeeded + failed) / runs.length) * 100}%, #c7d2df 0)`
                : 'var(--color-border)',
            }}
          >
            <div>
              <strong>{rate === null ? '—' : `${rate}%`}</strong>
              <span>{text.successRate}</span>
            </div>
          </div>
          <dl className={styles.outcomeLegend}>
            <div>
              <dt>
                <i className={styles.healthPoint} data-status="healthy" />
                {text.success}
              </dt>
              <dd>{succeeded}</dd>
            </div>
            <div>
              <dt>
                <i className={styles.healthPoint} data-status="offline" />
                {text.failed}
              </dt>
              <dd>{failed}</dd>
            </div>
            <div>
              <dt>
                <i className={styles.healthPoint} data-status="unknown" />
                {text.skipped}
              </dt>
              <dd>{skipped}</dd>
            </div>
          </dl>
          {!runs.length && <p>{text.noRuns}</p>}
          <p className={styles.monitorFootnote}>{text.rateHelp}</p>
        </section>
      </div>
      <p className={styles.monitorFootnote}>{text.latestOnly}</p>
    </div>
  );
}
