'use client';

import type { TelemetryPointDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { EmptyState } from '@/ui/states';
import { Panel } from '../shell/operations-ui';
import styles from './analytics.module.css';

const copy = vi.analytics;
export const formatMetric = (value: number | null | undefined, digits = 1): string =>
  value == null ? copy.none : value.toLocaleString('vi-VN', { maximumFractionDigits: digits });
export const formatTime = (at: number): string =>
  new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function MetricChart({
  points,
  field,
  title,
  description,
  unit,
}: {
  points: TelemetryPointDto[];
  field: 'requestRate' | 'p95Ms';
  title: string;
  description: string;
  unit: string;
}) {
  const available = points.filter((point) => point[field] !== null);
  const max = Math.max(...available.map((point) => point[field] ?? 0), 0.001);
  const first = points[0]?.at ?? 0;
  const last = points.at(-1)?.at ?? first;
  const getX = (at: number) => 48 + ((at - first) / Math.max(last - first, 1)) * 640;
  const getY = (value: number) => 180 - (value / max) * 150;
  // A missing sample breaks the line so upstream gaps never look like measured traffic.
  const path = points
    .map((point, index) => {
      const value = point[field];
      if (value === null) return '';
      const command = points[index - 1]?.[field] == null ? 'M' : 'L';
      return `${command}${getX(point.at)},${getY(value)}`;
    })
    .join(' ');
  return (
    <Panel title={`${title} (${unit})`} description={description}>
      {available.length ? (
        <>
          <svg className={styles.chart} viewBox="0 0 720 218" aria-label={title}>
            <title>{title}</title>
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1="48"
                  x2="688"
                  y1={getY(max * fraction)}
                  y2={getY(max * fraction)}
                  className={styles.gridLine}
                />
                <text x="38" y={getY(max * fraction) + 4} textAnchor="end">
                  {formatMetric(max * fraction, 2)}
                </text>
              </g>
            ))}
            <path d={path} className={field === 'p95Ms' ? styles.latencyLine : styles.trafficLine} />
            {available.length === 1 && (
              <circle
                cx={getX(available[0]!.at)}
                cy={getY(available[0]![field]!)}
                r="4"
                className={styles.point}
              />
            )}
            {[first, first + (last - first) / 2, last].map((at, index) => (
              <text
                key={index}
                x={48 + index * 320}
                y="210"
                textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}
              >
                {new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </text>
            ))}
          </svg>
          <details className={styles.chartDetails}>
            <summary>{copy.chartData}</summary>
            <div className={styles.scroll}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th scope="col">{copy.time}</th>
                    <th scope="col" className="text-right">
                      {unit}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.at}>
                      <td>{formatTime(point.at)}</td>
                      <td className="text-right tabular-nums">{formatMetric(point[field], 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <EmptyState title={copy.noChartData} description={copy.warmup} />
      )}
    </Panel>
  );
}
