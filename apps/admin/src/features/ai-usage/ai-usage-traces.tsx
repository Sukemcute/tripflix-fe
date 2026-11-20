'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { aiInsightsControllerTraces } from '@tripflix/api-client/core-api/analytics/analytics';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { useDetailParam } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Panel } from '../shell/operations-ui';
import { AiTraceDrawer } from './ai-trace-drawer';
import { ANSWER_KINDS, answerKindLabel, count, formatDateTime, formatLatency } from './ai-usage-format';
import { formatUsd } from './ai-usage-range';

const copy = vi.aiUsage.traceBoard;
const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;
const MIN_COSTS = Object.keys(copy.minCosts) as (keyof typeof copy.minCosts)[];

/** Danh sách lượt chat với Tripi: lọc theo kết quả, chi phí và người dùng; bấm một lượt để xem các bước gọi LLM. */
export function AiUsageTraces({
  range,
  user,
  onClearUser,
}: {
  range: { from: string; to: string };
  user: { userId: string; name: string } | null;
  onClearUser: () => void;
}) {
  const [page, setPage] = useState(1);
  const [answerKind, setAnswerKind] = useState('all');
  const [minCost, setMinCost] = useState<keyof typeof copy.minCosts>('0');
  const { openId, open, close } = useDetailParam();
  const params = {
    ...range,
    page,
    pageSize: PAGE_SIZE,
    ...(user ? { userId: user.userId } : {}),
    ...(answerKind === 'all' ? {} : { answerKind }),
    ...(minCost === '0' ? {} : { minCostUsd: Number(minCost) }),
  };
  const traces = useQuery({
    queryKey: ['admin', 'ai-usage', 'traces', params],
    queryFn: async ({ signal }) => (await aiInsightsControllerTraces(params, { signal })).data,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = traces.isError ? undefined : traces.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <form className="admin-filters mb-4" onSubmit={(event) => event.preventDefault()}>
        <label>
          {copy.answerKind}
          <select
            value={answerKind}
            onChange={(event) => {
              setAnswerKind(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">{copy.answerKinds.all}</option>
            {ANSWER_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {answerKindLabel(kind)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.minCost}
          <select
            value={minCost}
            onChange={(event) => {
              setMinCost(event.target.value as keyof typeof copy.minCosts);
              setPage(1);
            }}
          >
            {MIN_COSTS.map((value) => (
              <option key={value} value={value}>
                {copy.minCosts[value]}
              </option>
            ))}
          </select>
        </label>
        {user && (
          <p className="flex items-center gap-3 self-end text-xs text-text-muted">
            {t('aiUsage.traceBoard.filteredUser', { name: user.name })}
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1 font-semibold text-teal-ink hover:bg-teal-soft"
              onClick={onClearUser}
            >
              {copy.clearUser}
            </button>
          </p>
        )}
      </form>

      <Panel title={copy.title} description={copy.description}>
        {traces.isError && <AdminApiError error={traces.error} retry={() => void traces.refetch()} />}
        {traces.isPending ? (
          <LoadingState />
        ) : !data || data.items.length === 0 ? (
          !traces.isError && <EmptyState title={copy.empty} />
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="ops-table" aria-label={copy.title}>
                <thead>
                  <tr>
                    <th scope="col">{copy.columns.time}</th>
                    <th scope="col">{copy.columns.user}</th>
                    <th scope="col">{copy.columns.question}</th>
                    <th scope="col">{copy.columns.intent}</th>
                    <th scope="col">{copy.columns.result}</th>
                    <th scope="col">{copy.columns.latency}</th>
                    <th scope="col">{copy.columns.steps}</th>
                    <th scope="col">{copy.columns.tokens}</th>
                    <th scope="col">{copy.columns.cost}</th>
                    <th scope="col">
                      <span className="sr-only">{copy.viewDetail}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.eventId}>
                      <td className="whitespace-nowrap">{formatDateTime(item.occurredAt)}</td>
                      <td>
                        <span className="font-semibold text-navy">
                          {item.displayName ?? vi.aiUsage.userBoard.deletedAccount}
                        </span>
                        <span className="block text-xs text-text-muted">{item.email ?? '—'}</span>
                      </td>
                      <td className="max-w-xs">
                        {item.question ?? '—'}
                        {item.isAction && (
                          <span className="block text-xs text-text-muted">{copy.action}</span>
                        )}
                      </td>
                      <td>{item.intent ?? '—'}</td>
                      <td className={item.answerKind === 'error' ? 'font-semibold text-danger' : ''}>
                        {answerKindLabel(item.answerKind)}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">{formatLatency(item.latencyMs)}</td>
                      <td className="tabular-nums">{item.steps}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {count.format(item.inputTokens)} / {count.format(item.outputTokens)}
                      </td>
                      <td className="tabular-nums">{formatUsd(item.costUsd)}</td>
                      <td>
                        {item.turnId ? (
                          <button
                            type="button"
                            className="whitespace-nowrap rounded-md border border-border px-3 py-1 text-xs font-semibold text-teal-ink hover:bg-teal-soft"
                            onClick={() => open(String(item.turnId))}
                          >
                            {copy.viewDetail}
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted" title={copy.noDetail}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="flex items-center justify-end gap-3 px-5 py-4 text-xs text-text-muted">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
                disabled={page <= 1 || traces.isFetching}
                onClick={() => setPage((value) => value - 1)}
              >
                {copy.previous}
              </button>
              <span>{t('aiUsage.traceBoard.pageOf', { page, pageCount })}</span>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
                disabled={page >= pageCount || traces.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                {copy.next}
              </button>
            </nav>
          </>
        )}
      </Panel>

      {openId && (
        <AiTraceDrawer
          turnId={openId}
          ids={(data?.items ?? []).flatMap((item) => (item.turnId ? [item.turnId] : []))}
          onOpen={open}
          onClose={close}
        />
      )}
    </>
  );
}
