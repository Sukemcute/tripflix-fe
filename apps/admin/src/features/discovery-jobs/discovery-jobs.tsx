'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiSession } from '@tripflix/api-client';
import {
  adminDiscoveryJobsControllerList,
  adminDiscoveryJobsControllerRun,
  adminDiscoveryJobsControllerSetInterval,
} from '@tripflix/api-client/core-api/admin-discovery-jobs/admin-discovery-jobs';
import type {
  DiscoveryJobDto,
  DiscoveryJobsDto,
  JobRunDto,
  RecommendStatsDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, LoadingState, Metric, Panel } from '../shell/operations-ui';
import { AdminApiError } from '../shell/api-state';
import { formatInterval, INTERVAL_PRESET_MINUTES, toIntervalMs } from './interval';
import { VocabGaps } from './vocab-gaps';

const copy = vi.discoveryJobs;
export type DiscoveryJobGroup = 'search' | 'recommend';

const RUNNING_POLL_MS = 2_000;
const IDLE_POLL_MS = 30_000;

/** Có job đang chạy thì làm mới 2 giây một lần để thấy job chạy xong; không thì 30 giây. */
export function nextPollMs(data: DiscoveryJobsDto | undefined): number {
  const isBusy = data?.jobs.some((job) => job.isRunning || job.runs[0]?.outcome === 'running');
  return isBusy ? RUNNING_POLL_MS : IDLE_POLL_MS;
}

const timestamp = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Bangkok',
  dateStyle: 'short',
  timeStyle: 'medium',
});
const formatAt = (at: number | string | null) => (at === null ? '—' : timestamp.format(new Date(at)));
const formatDuration = (ms: number | null) =>
  ms === null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

function formatSummary(run: JobRunDto): string {
  const s = run.summary;
  if (!s) return '—';
  if (s.posts !== undefined && s.users !== undefined)
    return t('discoveryJobs.summary.postsUsers', { posts: s.posts, users: s.users });
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
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="admin-badge">
          {data ? t('discoveryJobs.checkedAt', { time: formatAt(data.checkedAt) }) : vi.api.loading}
        </span>
      </div>
      <p className="admin-helper">
        {copy.polling} {!canRun && copy.superadminOnly}
      </p>
      {notice && <output className="admin-helper">{notice}</output>}
      {jobs.isError && <AdminApiError error={jobs.error} retry={() => void jobs.refetch()} />}
      {run.isError && <AdminApiError error={run.error} />}

      {jobs.isPending && <LoadingState />}
      {data && (
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={copy.history}>
          <Metric label={copy.running} value={data.jobs.filter((job) => job.isRunning).length} />
          <Metric
            label={copy.outcome.succeeded}
            value={
              data.jobs.flatMap((job) => job.runs).filter((entry) => entry.outcome === 'succeeded').length
            }
            hint={vi.adminOperations.loadedLog}
          />
          <Metric
            label={copy.outcome.failed}
            value={data.jobs.flatMap((job) => job.runs).filter((entry) => entry.outcome === 'failed').length}
            hint={vi.adminOperations.loadedLog}
            urgent
          />
          <Metric
            label={copy.outcome.skipped}
            value={data.jobs.flatMap((job) => job.runs).filter((entry) => entry.outcome === 'skipped').length}
            hint={vi.adminOperations.loadedLog}
          />
        </section>
      )}
      {data && !data.jobs.length && <EmptyState title={vi.adminOperations.noJobs} />}

      {data?.jobs.map((job) => {
        const isBusy =
          job.isRunning || job.runs[0]?.outcome === 'running' || (run.isPending && run.variables === job.job);
        return (
          <section key={job.job} className="admin-data" aria-label={copy.jobs[job.job]}>
            <div className="admin-data-heading">
              <div>
                <h2>
                  {copy.jobs[job.job]} <code>{job.job}</code>
                </h2>
                <p>
                  {job.intervalMs === null
                    ? copy.onBoot
                    : t('discoveryJobs.every', { interval: formatInterval(job.intervalMs) })}
                </p>
              </div>
              {canRun && (
                <button
                  type="button"
                  className="admin-primary"
                  disabled={isBusy}
                  onClick={() => run.mutate(job.job)}
                >
                  {isBusy ? copy.running : copy.run}
                </button>
              )}
            </div>
            {canRun && job.canChangeInterval && <IntervalEditor job={job} queryKey={queryKey} />}
            <JobDurationChart runs={job.runs} />
            <RunsTable runs={job.runs} />
          </section>
        );
      })}

      {data?.recommendStats && <RecommendStats stats={data.recommendStats} />}
      {group === 'search' && <VocabGaps />}
    </>
  );
}

function JobDurationChart({ runs }: { runs: JobRunDto[] }) {
  const data = runs
    .filter((run) => run.durationMs !== null)
    .slice(0, 12)
    .toReversed()
    .map((run) => ({ at: run.startedAt, durationMs: run.durationMs }));
  if (!data.length) return null;
  return (
    <Panel title={vi.adminOperations.duration} description={vi.adminOperations.durationHint}>
      <div className="h-48 w-full p-4" aria-label={vi.adminOperations.duration}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="at"
              tickFormatter={(at) =>
                new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              }
              fontSize={10}
              minTickGap={30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis width={48} fontSize={10} unit="ms" axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(at) => formatAt(Number(at))} />
            <Bar
              dataKey="durationMs"
              name={copy.columns.duration}
              unit=" ms"
              fill="var(--color-teal-ink)"
              maxBarSize={24}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function IntervalEditor({ job, queryKey }: { job: DiscoveryJobDto; queryKey: string[] }) {
  const client = useQueryClient();
  const [minutes, setMinutes] = useState(job.intervalMs === null ? '' : String(job.intervalMs / 60_000));
  const [notice, setNotice] = useState('');
  const save = useMutation({
    mutationFn: async (intervalMs: number | null) =>
      (await adminDiscoveryJobsControllerSetInterval(job.job, { intervalMs })).data,
    onSuccess: (result) => {
      if (result?.intervalMs) setMinutes(String(result.intervalMs / 60_000));
      setNotice(copy.interval.saved);
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const intervalMs = toIntervalMs(Number(minutes));
  const presets: number[] = [...INTERVAL_PRESET_MINUTES];
  const isPreset = presets.includes(Number(minutes));
  const isDefault = job.intervalMs === job.defaultIntervalMs;

  return (
    <>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          if (intervalMs !== null) save.mutate(intervalMs);
        }}
      >
        <label>
          {copy.interval.label}
          <select
            value={isPreset ? minutes : 'custom'}
            onChange={(event) => setMinutes(event.target.value === 'custom' ? '' : event.target.value)}
          >
            {presets.map((m) => (
              <option key={m} value={m}>
                {`${formatInterval(m * 60_000)}${m * 60_000 === job.defaultIntervalMs ? ` (${copy.interval.isDefault})` : ''}`}
              </option>
            ))}
            <option value="custom">{copy.interval.custom}</option>
          </select>
        </label>
        {!isPreset && (
          <label>
            {copy.interval.custom}
            <input
              type="number"
              min={1}
              max={1440}
              step={1}
              required
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
        )}
        <button
          type="submit"
          className="admin-primary"
          disabled={save.isPending || intervalMs === null || intervalMs === job.intervalMs}
        >
          {save.isPending ? copy.interval.saving : copy.interval.save}
        </button>
        {!isDefault && job.defaultIntervalMs !== null && (
          <button
            type="button"
            className="admin-secondary"
            disabled={save.isPending}
            onClick={() => save.mutate(null)}
          >
            {t('discoveryJobs.interval.reset', { interval: formatInterval(job.defaultIntervalMs) })}
          </button>
        )}
      </form>
      {minutes !== '' && intervalMs === null && (
        <output className="admin-helper">{copy.interval.invalid}</output>
      )}
      {job.job === 'recommend_build' && <p className="admin-helper">{copy.interval.recommendNote}</p>}
      {notice && <output className="admin-helper">{notice}</output>}
      {save.isError && <AdminApiError error={save.error} />}
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
                <span data-outcome={r.outcome} className={`admin-status ${r.outcome === 'succeeded' ? '' : 'waiting'}`}>
                  {copy.outcome[r.outcome]}
                </span>
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
  const counts = (['interactionsLast10m', 'interactionsLast24h', 'posts', 'usersWithFeatures'] as const).map(
    (k) => [copy.stats[k], stats[k]] as const,
  );
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
