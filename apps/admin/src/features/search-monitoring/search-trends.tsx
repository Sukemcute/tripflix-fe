'use client';

import { vi } from '@tripflix/i18n';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styles from './search-monitoring.module.css';

const copy = vi.searchMonitoring;
const text = copy.trends;
const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Bangkok', hour12: false });

export interface SearchObservation {
  requestKey: string;
  recordedAt: number;
  elapsedMs: number;
  total: number | null;
  corrections: number | null;
  sections: { kind: string; total: number }[];
}

function TrendChart({
  title,
  samples,
  metric,
  unit,
}: {
  title: string;
  samples: SearchObservation[];
  metric: 'elapsedMs' | 'total' | 'corrections';
  unit: string;
}) {
  const values = samples.map((sample) => sample[metric]);
  return (
    <section className={styles.panel} aria-label={title}>
      <h2>{title}</h2>
      <p className={styles.hint}>{unit}</p>
      <div className="mt-4 h-52 w-full" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={samples} margin={{ top: 8, right: 16, bottom: 12, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="recordedAt"
              tickFormatter={formatTime}
              fontSize={10}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
              stroke="var(--color-text-muted)"
            />
            <YAxis
              width={44}
              fontSize={10}
              axisLine={false}
              tickLine={false}
              stroke="var(--color-text-muted)"
            />
            <Tooltip labelFormatter={(at) => formatTime(Number(at))} />
            <Line
              type="linear"
              dataKey={metric}
              name={title}
              unit={` ${unit}`}
              stroke="var(--color-teal-ink)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {values.every((value) => value === null) ? (
        <p className={styles.hint}>{text.noValues}</p>
      ) : (
        samples.length === 1 && <p className={styles.hint}>{text.oneSample}</p>
      )}
    </section>
  );
}

export function SearchTrends({
  query,
  samples,
  requestKey,
  isMonitoring,
  isFetching,
  onToggle,
  onSample,
  onGoQuery,
}: {
  query: string | null;
  samples: SearchObservation[];
  requestKey: string | null;
  isMonitoring: boolean;
  isFetching: boolean;
  onToggle: () => void;
  onSample: () => void;
  onGoQuery: () => void;
}) {
  const series = samples.filter((sample) => sample.requestKey === requestKey);
  const successful = series.filter((sample) => sample.total !== null);
  const current = successful.at(-1);
  const previous = successful.at(-2);
  const last = series.at(-1);
  const maxSection = Math.max(
    1,
    ...(current?.sections.map((entry) => entry.total) ?? []),
    ...(previous?.sections.map((entry) => entry.total) ?? []),
  );
  const kindLabel = (kind: string) => copy.kinds[kind as keyof typeof copy.kinds] ?? kind;

  return (
    <div className={styles.results}>
      <section className={styles.panel} aria-label={text.title}>
        <div className={styles.resultHeading}>
          <div>
            <h2>{text.title}</h2>
            <span className="admin-badge">{isMonitoring ? text.active : text.paused}</span>
          </div>
          <div className={styles.trendActions}>
            <button className="admin-secondary" disabled={!requestKey || isFetching} onClick={onSample}>
              {text.sample}
            </button>
            <button
              className={isMonitoring ? 'admin-secondary' : 'admin-primary'}
              disabled={!requestKey || (!isMonitoring && isFetching)}
              onClick={onToggle}
            >
              {isMonitoring ? text.stop : text.start}
            </button>
          </div>
        </div>
        {query && <p className={styles.trendQuery}>“{query}”</p>}
        {requestKey && (
          <details>
            <summary>{text.request}</summary>
            <pre>{requestKey}</pre>
          </details>
        )}
        <p className={styles.trendScope}>{text.scope}</p>
        <p className={styles.hint}>{text.pollingHelp}</p>
      </section>
      {!series.length ? (
        <section className={`${styles.panel} ${styles.initial}`}>
          <h2>{text.empty}</h2>
          <p>{text.emptyHelp}</p>
          <button className="admin-secondary" onClick={onGoQuery}>
            {text.goQuery}
          </button>
        </section>
      ) : (
        <>
          <div className={styles.metrics} aria-live="polite">
            <div>
              <span>{text.samples}</span>
              <strong>{series.length}</strong>
            </div>
            <div>
              <span>{text.errors}</span>
              <strong>{series.length - successful.length}</strong>
            </div>
            <div>
              <span>{text.emptyRate}</span>
              <strong>
                {successful.length
                  ? `${((successful.filter((sample) => sample.total === 0).length / successful.length) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
                  : text.missing}
              </strong>
            </div>
            <div>
              <span>{text.latest}</span>
              <strong className={styles.trendTime}>
                {last ? formatTime(last.recordedAt) : text.missing}
              </strong>
            </div>
          </div>
          <p className={styles.hint}>
            {text.emptyRateHelp} {text.chartHelp}
          </p>
          <div className={styles.trendGrid}>
            <TrendChart title={text.latency} samples={series} metric="elapsedMs" unit="ms" />
            <TrendChart title={text.results} samples={series} metric="total" unit={text.countUnit} />
            <TrendChart title={text.fixes} samples={series} metric="corrections" unit={text.fixUnit} />
            <section className={styles.panel} aria-label={text.sections}>
              <h2>{text.sections}</h2>
              <p>{text.sectionHelp}</p>
              {current?.sections.length && previous?.sections.length ? (
                <>
                  <div className={styles.trendLegend}>
                    <span>
                      <i className={styles.previousSwatch} />
                      {text.previous} · {formatTime(previous.recordedAt)}
                    </span>
                    <span>
                      <i className={styles.currentSwatch} />
                      {text.current} · {formatTime(current.recordedAt)}
                    </span>
                  </div>
                  <div className={styles.regionBars}>
                    {current.sections.map((entry) => {
                      const before =
                        previous.sections.find((section) => section.kind === entry.kind)?.total ?? 0;
                      const difference = entry.total - before;
                      return (
                        <div key={entry.kind} className={styles.regionRow}>
                          <span>{kindLabel(entry.kind)}</span>
                          <div>
                            <div className={styles.regionTrack}>
                              <span
                                className={styles.previousBar}
                                style={{ width: `${(before / maxSection) * 100}%` }}
                              />
                              <b>{before}</b>
                            </div>
                            <div className={styles.regionTrack}>
                              <span
                                className={styles.currentBar}
                                style={{ width: `${(entry.total / maxSection) * 100}%` }}
                              />
                              <b>{entry.total}</b>
                            </div>
                          </div>
                          <span aria-label={`${text.change}: ${difference}`}>
                            {difference > 0 ? '+' : ''}
                            {difference}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className={styles.empty}>{text.sectionEmpty}</p>
              )}
            </section>
          </div>
          <details className={styles.panel}>
            <summary>{text.sampleTable}</summary>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>{text.time}</th>
                    <th>{text.status}</th>
                    <th>{copy.elapsed} (ms)</th>
                    <th>{copy.totalMatches}</th>
                    <th>{copy.corrections}</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((sample, index) => (
                    <tr key={index}>
                      <td>{formatTime(sample.recordedAt)}</td>
                      <td>{sample.total === null ? text.failed : text.success}</td>
                      <td>{sample.elapsedMs}</td>
                      <td>{sample.total ?? text.missing}</td>
                      <td>{sample.corrections ?? text.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
