'use client';

import { useQuery } from '@tanstack/react-query';
import { aiInsightsControllerTrace } from '@tripflix/api-client/core-api/analytics/analytics';
import type { AiTraceStepDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { DetailDrawer } from '@/ui/detail-drawer';
import { DetailSection } from '@/ui/detail-parts';
import { MetricStrip } from '@/ui/metric-strip';
import { LoadingState } from '@/ui/states';
import { buildDrawerNavigation } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
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
type TraceStep = AiTraceStepDto;

/** Màu thanh theo bước; bước lạ dùng màu cảnh báo. Chỉ dùng token. */
const stepColor = (step: string | null) =>
  step === 'controller' ? 'bg-navy' : step === 'responder' ? 'bg-teal' : 'bg-warning';

const nullableCount = (value: number | null) => (value === null ? '—' : count.format(value));

const stepColumns: DataColumn<TraceStep>[] = [
  { id: 'step', header: copy.columns.step, cell: (step) => stepLabel(step.step) },
  { id: 'model', header: copy.columns.model, cell: (step) => step.model },
  { id: 'in', header: copy.columns.inputTokens, align: 'right', cell: (step) => nullableCount(step.inputTokens) },
  { id: 'out', header: copy.columns.outputTokens, align: 'right', cell: (step) => nullableCount(step.outputTokens) },
  {
    id: 'latency',
    header: copy.columns.latency,
    align: 'right',
    cell: (step) => <span className="whitespace-nowrap">{formatLatency(step.latencyMs)}</span>,
  },
  { id: 'cost', header: copy.columns.costUsd, align: 'right', cell: (step) => formatUsd(step.costUsd) },
];

/**
 * Trace một lượt chat (kiểu Langfuse): lượt, rồi các bước gọi LLM với model, token, chi phí, thời gian,
 * và dòng thời gian cho thấy bước nào chậm. Chỉ siêu dữ liệu, không có prompt hay câu trả lời.
 */
export function AiTraceDrawer({
  turnId,
  ids,
  onOpen,
  onClose,
}: {
  turnId: string;
  ids: readonly string[];
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['admin', 'ai-usage', 'trace', turnId],
    queryFn: async ({ signal }) => (await aiInsightsControllerTrace(turnId, { signal })).data,
    retry: false,
  });
  const data = detail.isError ? undefined : detail.data;
  const trace = data?.trace;
  const waterfall = trace && data ? buildWaterfall(trace, data.steps) : undefined;

  return (
    <DetailDrawer
      size="wide"
      title={trace?.question ?? copy.turn}
      subtitle={
        trace
          ? `${trace.displayName ?? vi.aiUsage.userBoard.deletedAccount} · ${trace.email ?? '—'} · ${formatDateTime(trace.occurredAt)}`
          : undefined
      }
      navigation={buildDrawerNavigation(ids, turnId, onOpen)}
      scrollKey={turnId}
      onClose={onClose}
    >
      {detail.isError && <AdminApiError error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending ? (
        <LoadingState rows={5} />
      ) : trace && data && waterfall ? (
        <>
          <MetricStrip
            label={copy.turn}
            items={[
              {
                id: 'latency',
                label: copy.totalLatency,
                value: formatLatency(trace.latencyMs),
                hint: answerKindLabel(trace.answerKind),
              },
              {
                id: 'steps',
                label: copy.steps,
                value: count.format(data.steps.length),
                hint: trace.intent ?? undefined,
              },
              {
                id: 'tokens',
                label: vi.aiUsage.traceBoard.columns.tokens,
                value: `${count.format(trace.inputTokens)} / ${count.format(trace.outputTokens)}`,
              },
              { id: 'cost', label: vi.aiUsage.traceBoard.columns.cost, value: formatUsd(trace.costUsd) },
            ]}
          />

          <DetailSection title={copy.timeline}>
            {data.steps.length === 0 ? (
              <p className="text-[13px] text-text-muted">{copy.noSteps}</p>
            ) : (
              <ul className="space-y-2">
                {data.steps.map((step, index) => {
                  const row = waterfall.rows[index];
                  return (
                    <li
                      key={step.id}
                      className="grid grid-cols-[minmax(96px,1fr)_minmax(0,3fr)_64px] items-center gap-3 text-xs"
                    >
                      <span>{stepLabel(step.step)}</span>
                      <span
                        className="relative h-2 overflow-hidden rounded-adm-sm bg-surface-muted"
                        aria-hidden="true"
                      >
                        <span
                          className={`absolute inset-y-0 rounded-adm-sm ${stepColor(step.step)}`}
                          style={{ left: `${row?.offsetPct ?? 0}%`, width: `${row?.widthPct ?? 1}%` }}
                        />
                      </span>
                      <span className="text-right text-text-muted tabular-nums">{formatLatency(step.latencyMs)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </DetailSection>

          {data.steps.length > 0 && (
            <DetailSection title={copy.steps}>
              <DataTable label={copy.steps} columns={stepColumns} rows={data.steps} getRowId={(step) => step.id} />
            </DetailSection>
          )}
          <p className="mt-5 text-xs text-text-muted">
            {copy.estimated} {copy.metadataOnly}
          </p>
        </>
      ) : null}
    </DetailDrawer>
  );
}
