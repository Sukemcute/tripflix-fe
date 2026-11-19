'use client';

import { useQuery } from '@tanstack/react-query';
import {
  aiInsightsControllerTraces,
  aiInsightsControllerUsers,
} from '@tripflix/api-client/core-api/analytics/analytics';
import { vi } from '@tripflix/i18n';
import { AiKpi } from '../ai-usage/ai-kpi';
import { answerKindLabel, count, formatDateTime, formatLatency } from '../ai-usage/ai-usage-format';
import { formatUsd } from '../ai-usage/ai-usage-range';
import { AdminApiError } from '../shell/api-state';
import { LoadingState } from '../shell/operations-ui';

const copy = vi.userActivity.ai;
const RECENT_TURNS = 10;

/** Phần "Dùng AI" trong hồ sơ hành vi một người: tổng token, chi phí và 10 lượt chat gần nhất (SCRUM-179). */
export function UserAiUsage({ userId, range }: { userId: string; range: { from: string; to: string } }) {
  const usage = useQuery({
    queryKey: ['admin', 'user-activity', userId, 'ai-usage', range],
    queryFn: async ({ signal }) =>
      (await aiInsightsControllerUsers({ ...range, userId, page: 1, pageSize: 1 }, { signal })).data,
    retry: false,
  });
  const turns = useQuery({
    queryKey: ['admin', 'user-activity', userId, 'ai-traces', range],
    queryFn: async ({ signal }) =>
      (await aiInsightsControllerTraces({ ...range, userId, page: 1, pageSize: RECENT_TURNS }, { signal }))
        .data,
    retry: false,
  });
  const summary = usage.isError ? undefined : usage.data?.items[0];
  const items = turns.isError ? [] : (turns.data?.items ?? []);

  return (
    <section aria-label={copy.title}>
      <h3 className="mb-3 text-sm font-bold text-navy">{copy.title}</h3>
      {usage.isError && <AdminApiError error={usage.error} retry={() => void usage.refetch()} />}
      {turns.isError && <AdminApiError error={turns.error} retry={() => void turns.refetch()} />}
      {usage.isPending || turns.isPending ? (
        <LoadingState />
      ) : !summary && items.length === 0 ? (
        !usage.isError && !turns.isError && <p className="text-xs text-text-muted">{copy.empty}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AiKpi label={copy.conversations} value={summary ? count.format(summary.conversations) : '0'} />
            <AiKpi label={copy.calls} value={summary ? count.format(summary.calls) : '0'} />
            <AiKpi
              label={copy.tokens}
              value={
                summary
                  ? `${count.format(summary.inputTokens)} / ${count.format(summary.outputTokens)}`
                  : '0 / 0'
              }
            />
            <AiKpi label={copy.cost} value={formatUsd(summary?.costUsd ?? 0)} />
          </div>
          {items.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold text-text-muted">{copy.recentTurns}</h4>
              <div className="admin-table-scroll">
                <table className="ops-table" aria-label={copy.recentTurns}>
                  <thead>
                    <tr>
                      <th scope="col">{copy.turnColumns.time}</th>
                      <th scope="col">{copy.turnColumns.question}</th>
                      <th scope="col">{copy.turnColumns.result}</th>
                      <th scope="col">{copy.turnColumns.latency}</th>
                      <th scope="col">{copy.turnColumns.tokens}</th>
                      <th scope="col">{copy.turnColumns.cost}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.eventId}>
                        <td className="whitespace-nowrap">{formatDateTime(item.occurredAt)}</td>
                        <td className="max-w-xs">{item.question ?? '—'}</td>
                        <td className={item.answerKind === 'error' ? 'font-semibold text-danger' : ''}>
                          {answerKindLabel(item.answerKind)}
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{formatLatency(item.latencyMs)}</td>
                        <td className="whitespace-nowrap tabular-nums">
                          {count.format(item.inputTokens)} / {count.format(item.outputTokens)}
                        </td>
                        <td className="tabular-nums">{formatUsd(item.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-text-muted">{copy.seeMore}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
