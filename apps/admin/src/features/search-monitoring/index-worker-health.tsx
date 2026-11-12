'use client';

import { useQuery } from '@tanstack/react-query';
import { adminIndexHealthControllerCheck } from '@tripflix/api-client/core-api/admin-index-health/admin-index-health';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { WorkerMonitorCharts } from './worker-monitor-charts';
import styles from './search-monitoring.module.css';

const copy = vi.searchMonitoring.workers;
const clock = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
});
const timestamp = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Bangkok',
  dateStyle: 'short',
  timeStyle: 'medium',
});
const formatTimestamp = (at: number | null) => (at === null ? '—' : timestamp.format(at));

export function IndexWorkerHealth() {
  const health = useQuery({
    queryKey: ['admin', 'search-index-health'],
    queryFn: async ({ signal }) => (await adminIndexHealthControllerCheck({ signal })).data,
    retry: false,
    refetchInterval: 5 * 60_000,
  });

  const data = health.isError ? undefined : health.data;

  return (
    <div className={styles.results}>
      <section className={styles.panel} aria-label={copy.title}>
        <div className={styles.resultHeading}>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.polling}</p>
          </div>
          <button
            className="admin-secondary"
            disabled={health.isFetching}
            onClick={() => void health.refetch()}
          >
            {copy.refresh}
          </button>
        </div>
        {health.isPending && <output>{vi.api.loading}</output>}
        {health.isError && <AdminApiError error={health.error} />}
        {data && (
          <output className={styles.workerMeta}>
            {copy.checkedAt} · {formatTimestamp(data.checkedAt)}
          </output>
        )}
        {data?.workers.length === 0 && <p className={styles.empty}>{copy.empty}</p>}
        {!!data?.workers.length && (
          <div className={styles.trendLegend}>
            {Object.entries(copy.healthStatus).map(([status, label]) => (
              <span key={status}>
                <i className={styles.healthPoint} data-status={status} />
                {label}
              </span>
            ))}
          </div>
        )}
      </section>
      {!!data?.workers.length && <WorkerMonitorCharts data={data} />}
      {!!data?.workers.length && <h2>{copy.monitor.detail}</h2>}
      {data?.workers.map((worker) => (
        <section
          id={`worker-${worker.id}`}
          className={styles.panel}
          key={worker.id}
          aria-label={`Worker ${worker.name}`}
        >
          <div className={styles.resultHeading}>
            <div>
              <h3 className={styles.workerName}>
                {worker.name} · {worker.id.slice(0, 8)}
              </h3>
              <p>
                {copy.lastSeen} · {formatTimestamp(worker.lastSeenAt)}
              </p>
            </div>
            <span className={styles.healthBadge} data-status={worker.status}>
              {copy.healthStatus[worker.status]}
            </span>
          </div>
          <details open={worker.status !== 'offline'}>
            <summary>{copy.monitor.showDetail}</summary>
            <figure className={styles.healthHistory}>
              <figcaption>{copy.history}</figcaption>
              <ol className={styles.healthTimeline} aria-label={copy.history}>
                {worker.history.map(({ at, status }) => (
                  <li
                    key={at}
                    className={styles.healthPoint}
                    data-status={status}
                    title={`${clock.format(at)} · ${copy.healthStatus[status]}`}
                  >
                    <span className="sr-only">
                      {clock.format(at)} · {copy.healthStatus[status]}
                    </span>
                  </li>
                ))}
              </ol>
              <div className={styles.healthAxis} aria-hidden="true">
                <span>{clock.format(data.checkedAt - 2 * 60 * 60_000)}</span>
                <span>{clock.format(data.checkedAt)}</span>
              </div>
            </figure>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>{copy.job}</th>
                    <th>{copy.status}</th>
                    <th>{copy.startedAt}</th>
                    <th>{copy.duration}</th>
                    <th>{copy.lastSuccessAt}</th>
                    <th>{copy.count}</th>
                  </tr>
                </thead>
                <tbody>
                  {worker.jobs.map((job) => (
                    <tr key={job.job}>
                      <td>
                        <strong>{copy.jobs[job.job]}</strong>
                        <details>
                          <summary>{copy.logs}</summary>
                          <p>{copy.logsHelp}</p>
                          {job.logs?.length ? (
                            <ol className={styles.jobLogs}>
                              {job.logs.map((entry, index) => (
                                <li key={`${entry.at}-${index}`}>
                                  <time dateTime={new Date(entry.at).toISOString()}>
                                    {formatTimestamp(entry.at)}
                                  </time>
                                  <p>{entry.message}</p>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p>{copy.noLogs}</p>
                          )}
                        </details>
                      </td>
                      <td>
                        <span className={styles.healthBadge} data-status={job.status}>
                          {copy.jobStatus[job.status]}
                        </span>
                      </td>
                      <td>{formatTimestamp(job.startedAt)}</td>
                      <td>
                        {job.startedAt !== null && job.finishedAt !== null
                          ? `${(job.finishedAt - job.startedAt).toLocaleString('vi-VN')} ms`
                          : '—'}
                      </td>
                      <td>{formatTimestamp(job.lastSuccessAt)}</td>
                      <td>{job.count?.toLocaleString('vi-VN') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}
