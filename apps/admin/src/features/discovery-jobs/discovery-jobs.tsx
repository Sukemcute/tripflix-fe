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
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { SelectInput, TextField } from '@/ui/form-field';
import { MetricStrip } from '@/ui/metric-strip';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { Panel } from '../shell/operations-ui';
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
  const allRuns = data?.jobs.flatMap((job) => job.runs) ?? [];
  const countOutcome = (outcome: JobRunDto['outcome']) =>
    allRuns.filter((entry) => entry.outcome === outcome).length;
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-text-muted">
        {data ? t('discoveryJobs.checkedAt', { time: formatAt(data.checkedAt) }) : vi.api.loading}
        {' · '}
        {copy.polling} {!canRun && copy.superadminOnly}
      </p>
      {notice && <output className="block text-[13px] text-text-muted">{notice}</output>}
      {jobs.isError && <AdminApiError error={jobs.error} retry={() => void jobs.refetch()} />}
      {run.isError && <AdminApiError error={run.error} />}

      {jobs.isPending && <LoadingState />}
      {data && (
        <MetricStrip
          label={copy.history}
          items={[
            { id: 'running', label: copy.running, value: data.jobs.filter((job) => job.isRunning).length },
            {
              id: 'succeeded',
              label: copy.outcome.succeeded,
              value: countOutcome('succeeded'),
              hint: vi.adminOperations.loadedLog,
            },
            {
              id: 'failed',
              label: copy.outcome.failed,
              value: countOutcome('failed'),
              hint: vi.adminOperations.loadedLog,
              isUrgent: true,
            },
            {
              id: 'skipped',
              label: copy.outcome.skipped,
              value: countOutcome('skipped'),
              hint: vi.adminOperations.loadedLog,
            },
          ]}
        />
      )}
      {data && !data.jobs.length && <EmptyState title={vi.adminOperations.noJobs} />}

      {data?.jobs.map((job) => {
        const isBusy =
          job.isRunning || job.runs[0]?.outcome === 'running' || (run.isPending && run.variables === job.job);
        return (
          <Panel
            key={job.job}
            title={copy.jobs[job.job]}
            description={`${job.job} · ${
              job.intervalMs === null
                ? copy.onBoot
                : t('discoveryJobs.every', { interval: formatInterval(job.intervalMs) })
            }`}
            action={
              canRun && (
                <AdminButton variant="primary" disabled={isBusy} onClick={() => run.mutate(job.job)}>
                  {isBusy ? copy.running : copy.run}
                </AdminButton>
              )
            }
          >
            {canRun && job.canChangeInterval && <IntervalEditor job={job} queryKey={queryKey} />}
            <JobDurationChart runs={job.runs} />
            <RunsTable runs={job.runs} />
          </Panel>
        );
      })}

      {data?.recommendStats && <RecommendStats stats={data.recommendStats} />}
      {group === 'search' && <VocabGaps />}
    </div>
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
    <div className="border-t border-border px-4 py-3">
      <h3 className="text-[13px] font-semibold">{vi.adminOperations.duration}</h3>
      <p className="text-xs text-text-muted">{vi.adminOperations.durationHint}</p>
      <div className="mt-2 h-40 w-full" aria-label={vi.adminOperations.duration}>
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
    </div>
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
    <div className="space-y-2 border-t border-border px-4 py-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (intervalMs !== null) save.mutate(intervalMs);
        }}
      >
        <div className="w-56">
          <SelectInput
            label={copy.interval.label}
            value={isPreset ? minutes : 'custom'}
            onChange={(event) => setMinutes(event.target.value === 'custom' ? '' : event.target.value)}
          >
            {presets.map((m) => (
              <option key={m} value={m}>
                {`${formatInterval(m * 60_000)}${m * 60_000 === job.defaultIntervalMs ? ` (${copy.interval.isDefault})` : ''}`}
              </option>
            ))}
            <option value="custom">{copy.interval.custom}</option>
          </SelectInput>
        </div>
        {!isPreset && (
          <div className="w-40">
            <TextField
              label={copy.interval.custom}
              type="number"
              min={1}
              max={1440}
              step={1}
              required
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>
        )}
        <AdminButton
          type="submit"
          size="lg"
          variant="primary"
          disabled={save.isPending || intervalMs === null || intervalMs === job.intervalMs}
        >
          {save.isPending ? copy.interval.saving : copy.interval.save}
        </AdminButton>
        {!isDefault && job.defaultIntervalMs !== null && (
          <AdminButton size="lg" disabled={save.isPending} onClick={() => save.mutate(null)}>
            {t('discoveryJobs.interval.reset', { interval: formatInterval(job.defaultIntervalMs) })}
          </AdminButton>
        )}
      </form>
      {minutes !== '' && intervalMs === null && (
        <output className="block text-xs text-coral-ink">{copy.interval.invalid}</output>
      )}
      {job.job === 'recommend_build' && <p className="text-xs text-text-muted">{copy.interval.recommendNote}</p>}
      {notice && <output className="block text-xs text-text-muted">{notice}</output>}
      {save.isError && <AdminApiError error={save.error} />}
    </div>
  );
}

const outcomeTone = (outcome: JobRunDto['outcome']): StatusTone =>
  outcome === 'succeeded' ? 'success' : outcome === 'failed' ? 'danger' : outcome === 'running' ? 'info' : 'neutral';

const runColumns: DataColumn<JobRunDto>[] = [
  { id: 'startedAt', header: copy.columns.startedAt, cell: (r) => formatAt(r.startedAt) },
  { id: 'trigger', header: copy.columns.trigger, hideBelow: 'md', cell: (r) => copy.trigger[r.trigger] },
  {
    id: 'outcome',
    header: copy.columns.outcome,
    cell: (r) => <StatusBadge tone={outcomeTone(r.outcome)}>{copy.outcome[r.outcome]}</StatusBadge>,
  },
  { id: 'duration', header: copy.columns.duration, align: 'right', cell: (r) => formatDuration(r.durationMs) },
  { id: 'summary', header: copy.columns.summary, hideBelow: 'sm', cell: (r) => formatSummary(r) },
  {
    id: 'error',
    header: copy.columns.error,
    hideBelow: 'lg',
    cell: (r) => <span className="block max-w-xs truncate">{r.error ?? '—'}</span>,
  },
];

function RunsTable({ runs }: { runs: JobRunDto[] }) {
  return (
    <DataTable
      label={copy.history}
      columns={runColumns}
      rows={runs}
      getRowId={(r) => r.runId}
      empty={<EmptyState title={copy.noRuns} />}
      className="border-t border-border"
    />
  );
}

function RecommendStats({ stats }: { stats: RecommendStatsDto }) {
  const counts = (['interactionsLast10m', 'interactionsLast24h', 'posts', 'usersWithFeatures'] as const).map(
    (k) => [copy.stats[k], stats[k]] as const,
  );
  return (
    <Panel title={copy.stats.title}>
      <dl className="divide-y divide-border text-[13px]">
        {counts.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-text-muted">{label}</dt>
            <dd className="tabular-nums">{value.toLocaleString('vi-VN')}</dd>
          </div>
        ))}
        <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr]">
          <dt className="text-text-muted">{copy.stats.algos}</dt>
          <dd className="space-y-0.5">
            {stats.algos.map((a) => (
              <div key={a.name}>
                <code>{a.name}</code>: {a.postBuilder} · {a.userBuilder} · {a.ranker}
              </div>
            ))}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr]">
          <dt className="text-text-muted">{copy.stats.builders}</dt>
          <dd className="space-y-0.5">
            {stats.jobStates.map((s) => (
              <div key={s.name}>
                <code>{s.name}</code>: {s.lastRunAt ? formatAt(s.lastRunAt) : copy.stats.never}
                {s.lastError ? ` · ${s.lastError}` : ''}
              </div>
            ))}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
