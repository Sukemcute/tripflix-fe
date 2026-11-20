'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { aiInsightsControllerTraces } from '@tripflix/api-client/core-api/analytics/analytics';
import type { AiTraceItemDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { FilterToolbar, SelectField } from '@/ui/filter-toolbar';
import { Pagination } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { useDetailParam } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
import { Panel } from '../shell/operations-ui';
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

  const columns: DataColumn<AiTraceItemDto>[] = [
    {
      id: 'time',
      header: copy.columns.time,
      openLabel: (item) => `${copy.viewDetail}: ${formatDateTime(item.occurredAt)}`,
      cell: (item) => <span className="whitespace-nowrap">{formatDateTime(item.occurredAt)}</span>,
    },
    {
      id: 'user',
      header: copy.columns.user,
      hideBelow: 'md',
      cell: (item) => (
        <span className="block">
          <span className="block">{item.displayName ?? vi.aiUsage.userBoard.deletedAccount}</span>
          <span className="block text-xs text-text-muted">{item.email ?? '—'}</span>
        </span>
      ),
    },
    {
      id: 'question',
      header: copy.columns.question,
      cell: (item) => (
        <span className="block max-w-xs">
          <span className="line-clamp-2">{item.question ?? '—'}</span>
          {item.isAction && <span className="block text-xs text-text-muted">{copy.action}</span>}
        </span>
      ),
    },
    { id: 'intent', header: copy.columns.intent, hideBelow: 'xl', cell: (item) => item.intent ?? '—' },
    {
      id: 'result',
      header: copy.columns.result,
      cell: (item) => (
        <StatusBadge tone={item.answerKind === 'error' ? 'danger' : 'neutral'}>
          {answerKindLabel(item.answerKind)}
        </StatusBadge>
      ),
    },
    {
      id: 'latency',
      header: copy.columns.latency,
      align: 'right',
      hideBelow: 'lg',
      cell: (item) => formatLatency(item.latencyMs),
    },
    { id: 'steps', header: copy.columns.steps, align: 'right', hideBelow: 'xl', cell: (item) => item.steps },
    {
      id: 'tokens',
      header: copy.columns.tokens,
      align: 'right',
      hideBelow: 'lg',
      cell: (item) => `${count.format(item.inputTokens)} / ${count.format(item.outputTokens)}`,
    },
    { id: 'cost', header: copy.columns.cost, align: 'right', cell: (item) => formatUsd(item.costUsd) },
    {
      id: 'detail',
      header: <span className="sr-only">{copy.viewDetail}</span>,
      align: 'right',
      cell: (item) =>
        item.turnId ? (
          <AdminButton size="sm" onClick={() => open(String(item.turnId))}>
            {copy.viewDetail}
          </AdminButton>
        ) : (
          <span className="text-xs text-text-muted" title={copy.noDetail}>
            —
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterToolbar
        summary={user ? t('aiUsage.traceBoard.filteredUser', { name: user.name }) : undefined}
        actions={
          user ? (
            <AdminButton size="sm" onClick={onClearUser}>
              {copy.clearUser}
            </AdminButton>
          ) : undefined
        }
      >
        <SelectField
          label={copy.answerKind}
          value={answerKind}
          options={[
            { value: 'all', label: copy.answerKinds.all },
            ...ANSWER_KINDS.map((kind) => ({ value: kind, label: answerKindLabel(kind) })),
          ]}
          onChange={(value) => {
            setAnswerKind(value);
            setPage(1);
          }}
        />
        <SelectField
          label={copy.minCost}
          value={minCost}
          options={MIN_COSTS.map((value) => ({ value, label: copy.minCosts[value] }))}
          onChange={(value) => {
            setMinCost(value as keyof typeof copy.minCosts);
            setPage(1);
          }}
        />
      </FilterToolbar>

      <Panel title={copy.title} description={copy.description}>
        {traces.isError && <AdminApiError error={traces.error} retry={() => void traces.refetch()} />}
        <DataTable
          label={copy.title}
          columns={columns}
          rows={data?.items ?? []}
          getRowId={(item) => item.eventId}
          onRowOpen={(item) => {
            if (item.turnId) open(String(item.turnId));
          }}
          isRowSelected={(item) => !!openId && String(item.turnId) === openId}
          isLoading={traces.isPending}
          empty={traces.isError ? undefined : <EmptyState title={copy.empty} />}
        />
        {!!data && data.total > 0 && (
          <div className="px-3 pb-3">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              isFetching={traces.isFetching}
              onPageChange={setPage}
            />
          </div>
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
    </div>
  );
}
