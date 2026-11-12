'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiSession } from '@tripflix/api-client';
import {
  adminDiscoveryJobsControllerList,
  adminDiscoveryJobsControllerRun,
} from '@tripflix/api-client/core-api/admin-discovery-jobs/admin-discovery-jobs';
import type { DiscoveryJobDto, DiscoveryJobsDto, JobRunDto, RecommendStatsDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

const copy = vi.discoveryJobs;
export type DiscoveryJobGroup = 'search' | 'recommend';

const RUNNING_POLL_MS = 2_000;
const IDLE_POLL_MS = 30_000;

/** Có job đang chạy thì làm mới 2 giây một lần để thấy job chạy xong; không thì 30 giây. */
export function nextPollMs(data: DiscoveryJobsDto | undefined): number {
  const isBusy = data?.jobs.some((job) => job.isRunning || job.runs[0]?.outcome === 'running');
  return isBusy ? RUNNING_POLL_MS : IDLE_POLL_MS;
}

const timestamp = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' });
const formatAt = (at: number | string | null) => (at === null ? '—' : timestamp.format(new Date(at)));
const formatDuration = (ms: number | null) => (ms === null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const formatInterval = (ms: number) => (ms >= 3_600_000 ? `${ms / 3_600_000} giờ` : `${ms / 60_000} phút`);

function formatSummary(run: JobRunDto): string {
  const s = run.summary;
  if (!s) return '—';
  if (s.posts !== undefined && s.users !== undefined) return t('discoveryJobs.summary.postsUsers', { posts: s.posts, users: s.users });
  if (s.deleted !== undefined) return t('discoveryJobs.summary.deleted', { deleted: s.deleted });
  if (s.count !== undefined) return t('discoveryJobs.summary.count', { count: s.count });
  return '—';
}

export function DiscoveryJobs({ group }: { group: DiscoveryJobGroup }) {
  const client = useQueryClient();
  const { user } = useApiSession();
  const canRun = user?.role === 'superadmin';
  const queryKey = ['admin', 'discovery-jobs', group];
  const [notice, setNotice] = useState('');

  const jobs = useQuery({
    queryKey,
    queryFn: async ({ signal }) => (await adminDiscoveryJobsControllerList({ group }, { signal })).data,
    retry: false,
    refetchInterval: (query) => nextPollMs(query.state.data),
  });

  const run = useMutation({
    mutationFn: async (job: DiscoveryJobDto['job']) => (await adminDiscoveryJobsControllerRun(job)).data,
    onSuccess: (result) => setNotice(result?.accepted === false ? copy.rejectedRunning : ''),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });

  const data = jobs.isError ? undefined : jobs.data;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{copy.eyebrow}</p>
          <h1>{copy[group].title}</h1>
          <p>{copy[group].description}</p>
        </div>
        <span className="admin-badge">{data ? t('discoveryJobs.checkedAt', { time: formatAt(data.checkedAt) }) : vi.api.loading}</span>
      </div>
      <p className="admin-helper">
        {copy.polling} {!canRun && copy.superadminOnly}
      </p>
      {notice && <output className="admin-helper">{notice}</output>}
      {jobs.isError && <AdminApiError error={jobs.error} retry={() => void jobs.refetch()} />}
      {run.isError && <AdminApiError error={run.error} />}

      {data?.jobs.map((job) => {
        const isBusy = job.isRunning || job.runs[0]?.outcome === 'running' || (run.isPending && run.variables === job.job);
        return (
          <section key={job.job} className="admin-data" aria-label={copy.jobs[job.job]}>
            <div className="admin-data-heading">
              <div>
                <h2>
                  {copy.jobs[job.job]} <code>{job.job}</code>
                </h2>
                <p>{job.intervalMs === null ? copy.onBoot : t('discoveryJobs.every', { interval: formatInterval(job.intervalMs) })}</p>
              </div>
              {canRun && (
                <button type="button" className="admin-primary" disabled={isBusy} onClick={() => run.mutate(job.job)}>
                  {isBusy ? copy.running : copy.run}
                </button>
              )}
            </div>
            <RunsTable runs={job.runs} />
          </section>
        );
      })}

      {data?.recommendStats && <RecommendStats stats={data.recommendStats} />}
    </>
  );
}

function RunsTable({ runs }: { runs: JobRunDto[] }) {
  if (!runs.length) return <output className="admin-empty">{copy.noRuns}</output>;
  return (
    <div className="admin-table-scroll">
      <table aria-label={copy.history}>
        <thead>
          <tr>
            <th>{copy.columns.startedAt}</th>
            <th>{copy.columns.trigger}</th>
            <th>{copy.columns.outcome}</th>
            <th>{copy.columns.duration}</th>
            <th>{copy.columns.summary}</th>
            <th>{copy.columns.error}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.runId}>
              <td>{formatAt(r.startedAt)}</td>
              <td>{copy.trigger[r.trigger]}</td>
              <td>
                <span className={`admin-status ${r.outcome === 'succeeded' ? '' : 'waiting'}`}>{copy.outcome[r.outcome]}</span>
              </td>
              <td>{formatDuration(r.durationMs)}</td>
              <td>{formatSummary(r)}</td>
              <td>{r.error ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendStats({ stats }: { stats: RecommendStatsDto }) {
  const counts = (['interactionsLast10m', 'interactionsLast24h', 'posts', 'usersWithFeatures'] as const).map((k) => [copy.stats[k], stats[k]] as const);
  return (
    <section className="admin-data" aria-label={copy.stats.title}>
      <div className="admin-data-heading">
        <div>
          <h2>{copy.stats.title}</h2>
        </div>
      </div>
      <div className="admin-table-scroll">
        <table>
          <tbody>
            {counts.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">{copy.stats.algos}</th>
              <td>
                {stats.algos.map((a) => (
                  <div key={a.name}>
                    <code>{a.name}</code>: {a.postBuilder} · {a.userBuilder} · {a.ranker}
                  </div>
                ))}
              </td>
            </tr>
            <tr>
              <th scope="row">{copy.stats.builders}</th>
              <td>
                {stats.jobStates.map((s) => (
                  <div key={s.name}>
                    <code>{s.name}</code>: {s.lastRunAt ? formatAt(s.lastRunAt) : copy.stats.never}
                    {s.lastError ? ` · ${s.lastError}` : ''}
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
