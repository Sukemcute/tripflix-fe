'use client';

import { useQuery } from '@tanstack/react-query';
import { aiInsightsControllerTrace } from '@tripflix/api-client/core-api/analytics/analytics';
import { t, vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { LoadingState } from '../shell/operations-ui';
import { UserActivityDialog } from '../user-activity/user-activity-dialog';
import { AiKpi } from './ai-kpi';
import {
  answerKindLabel,
  buildWaterfall,
  count,
  formatDateTime,
  formatLatency,
  stepLabel,
} from './ai-usage-format';
import { formatUsd } from './ai-usage-range';

const copy = vi.aiUsage.traceDetail;

/** Màu thanh theo bước; bước lạ dùng màu cảnh báo. Chỉ dùng token. */
const stepColor = (step: string | null) =>
  step === 'controller' ? 'bg-navy' : step === 'responder' ? 'bg-teal' : 'bg-warning';

/**
 * Trace một lượt chat (kiểu Langfuse): lượt, rồi các bước gọi LLM với model, token, chi phí, thời gian,
 * và dòng thời gian cho thấy bước nào chậm. Chỉ siêu dữ liệu, không có prompt hay câu trả lời.
 * Dùng lại dialog rộng của tính năng hành vi người dùng.
 */
export function AiTraceDialog({ turnId, onClose }: { turnId: string; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['admin', 'ai-usage', 'trace', turnId],
    queryFn: async ({ signal }) => (await aiInsightsControllerTrace(turnId, { signal })).data,
    retry: false,
  });
  const data = detail.isError ? undefined : detail.data;
  const trace = data?.trace;
  const waterfall = trace && data ? buildWaterfall(trace, data.steps) : undefined;

  return (
    <UserActivityDialog
      title={t('aiUsage.traceDetail.title', { question: trace?.question ?? copy.turn })}
      description={
        trace
          ? `${trace.displayName ?? vi.aiUsage.userBoard.deletedAccount} · ${trace.email ?? '—'} · ${formatDateTime(trace.occurredAt)}`
          : undefined
      }
      onClose={onClose}
    >
      {detail.isError && <AdminApiError error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending ? (
        <LoadingState />
      ) : trace && data && waterfall ? (
        <div className="space-y-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AiKpi
              label={copy.totalLatency}
              value={formatLatency(trace.latencyMs)}
              hint={answerKindLabel(trace.answerKind)}
            />
            <AiKpi
              label={copy.steps}
              value={count.format(data.steps.length)}
              hint={trace.intent ?? undefined}
            />
            <AiKpi
              label={vi.aiUsage.traceBoard.columns.tokens}
              value={`${count.format(trace.inputTokens)} / ${count.format(trace.outputTokens)}`}
            />
            <AiKpi label={vi.aiUsage.traceBoard.columns.cost} value={formatUsd(trace.costUsd)} />
          </div>

          <section aria-label={copy.timeline}>
            <h3 className="mb-3 text-sm font-bold text-navy">{copy.timeline}</h3>
            {data.steps.length === 0 ? (
              <p className="text-xs text-text-muted">{copy.noSteps}</p>
            ) : (
              <ul className="space-y-2">
                {data.steps.map((step, index) => {
                  const row = waterfall.rows[index];
                  return (
                    <li
                      key={step.id}
                      className="grid grid-cols-[minmax(120px,1fr)_minmax(0,3fr)_72px] items-center gap-3 text-xs"
                    >
                      <span className="font-semibold">{stepLabel(step.step)}</span>
                      <span
                        className="relative h-3 overflow-hidden rounded-full bg-surface-muted"
                        aria-hidden="true"
                      >
                        <span
                          className={`absolute inset-y-0 rounded-full ${stepColor(step.step)}`}
                          style={{ left: `${row?.offsetPct ?? 0}%`, width: `${row?.widthPct ?? 1}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums text-text-muted">
                        {formatLatency(step.latencyMs)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {data.steps.length > 0 && (
            <section aria-label={copy.steps}>
              <div className="admin-table-scroll">
                <table className="ops-table" aria-label={copy.steps}>
                  <thead>
                    <tr>
                      <th scope="col">{copy.columns.step}</th>
                      <th scope="col">{copy.columns.model}</th>
                      <th scope="col">{copy.columns.inputTokens}</th>
                      <th scope="col">{copy.columns.outputTokens}</th>
                      <th scope="col">{copy.columns.latency}</th>
                      <th scope="col">{copy.columns.costUsd}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.steps.map((step) => (
                      <tr key={step.id}>
                        <td className="font-semibold">{stepLabel(step.step)}</td>
                        <td>{step.model}</td>
                        <td className="tabular-nums">
                          {step.inputTokens === null ? '—' : count.format(step.inputTokens)}
                        </td>
                        <td className="tabular-nums">
                          {step.outputTokens === null ? '—' : count.format(step.outputTokens)}
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{formatLatency(step.latencyMs)}</td>
                        <td className="tabular-nums">{formatUsd(step.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <p className="text-xs text-text-muted">
            {copy.estimated} {copy.metadataOnly}
          </p>
        </div>
      ) : null}
    </UserActivityDialog>
  );
}
