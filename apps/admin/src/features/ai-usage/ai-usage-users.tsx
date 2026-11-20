'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { aiInsightsControllerUsers } from '@tripflix/api-client/core-api/analytics/analytics';
import type { AiUserUsageItemDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { Pagination } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { AdminApiError } from '../shell/api-state';
import { Panel } from '../shell/operations-ui';
import { count, formatDateTime } from './ai-usage-format';
import { formatUsd } from './ai-usage-range';

const copy = vi.aiUsage.userBoard;
const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;

/** Người dùng xếp theo chi phí AI. Bấm "Xem trace" mở tab Trace đã lọc theo người đó. */
export function AiUsageUsers({
  range,
  onOpenTraces,
}: {
  range: { from: string; to: string };
  onOpenTraces: (user: { userId: string; name: string }) => void;
}) {
  const [page, setPage] = useState(1);
  const params = { ...range, page, pageSize: PAGE_SIZE };
  const users = useQuery({
    queryKey: ['admin', 'ai-usage', 'users', params],
    queryFn: async ({ signal }) => (await aiInsightsControllerUsers(params, { signal })).data,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = users.isError ? undefined : users.data;
  const nameOf = (user: AiUserUsageItemDto) => user.displayName ?? copy.deletedAccount;

  const columns: DataColumn<AiUserUsageItemDto>[] = [
    { id: 'user', header: copy.columns.user, cell: (user) => nameOf(user) },
    { id: 'email', header: copy.columns.email, hideBelow: 'lg', cell: (user) => user.email ?? '—' },
    {
      id: 'conversations',
      header: copy.columns.conversations,
      align: 'right',
      hideBelow: 'md',
      cell: (user) => count.format(user.conversations),
    },
    { id: 'calls', header: copy.columns.calls, align: 'right', cell: (user) => count.format(user.calls) },
    {
      id: 'inputTokens',
      header: copy.columns.inputTokens,
      align: 'right',
      hideBelow: 'xl',
      cell: (user) => count.format(user.inputTokens),
    },
    {
      id: 'outputTokens',
      header: copy.columns.outputTokens,
      align: 'right',
      hideBelow: 'xl',
      cell: (user) => count.format(user.outputTokens),
    },
    { id: 'cost', header: copy.columns.costUsd, align: 'right', cell: (user) => formatUsd(user.costUsd) },
    { id: 'lastAt', header: copy.columns.lastAt, hideBelow: 'md', cell: (user) => formatDateTime(user.lastAt) },
    {
      id: 'traces',
      header: <span className="sr-only">{copy.viewTraces}</span>,
      align: 'right',
      cell: (user) => (
        <AdminButton size="sm" onClick={() => onOpenTraces({ userId: user.userId, name: nameOf(user) })}>
          {copy.viewTraces}
        </AdminButton>
      ),
    },
  ];

  return (
    <Panel title={copy.title} description={copy.description}>
      {users.isError && <AdminApiError error={users.error} retry={() => void users.refetch()} />}
      <DataTable
        label={copy.title}
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(user) => user.userId}
        isLoading={users.isPending}
        empty={users.isError ? undefined : <EmptyState title={copy.empty} />}
      />
      {!!data && data.total > 0 && (
        <div className="px-3 pb-3">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            isFetching={users.isFetching}
            onPageChange={setPage}
          />
        </div>
      )}
    </Panel>
  );
}
