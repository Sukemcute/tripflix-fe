'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { aiInsightsControllerUsers } from '@tripflix/api-client/core-api/analytics/analytics';
import type { AiUserUsageItemDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Panel } from '../shell/operations-ui';
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
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const nameOf = (user: AiUserUsageItemDto) => user.displayName ?? copy.deletedAccount;

  return (
    <Panel title={copy.title} description={copy.description}>
      {users.isError && <AdminApiError error={users.error} retry={() => void users.refetch()} />}
      {users.isPending ? (
        <LoadingState />
      ) : !data || data.items.length === 0 ? (
        !users.isError && <EmptyState title={copy.empty} />
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="ops-table" aria-label={copy.title}>
              <thead>
                <tr>
                  <th scope="col">{copy.columns.user}</th>
                  <th scope="col">{copy.columns.email}</th>
                  <th scope="col">{copy.columns.conversations}</th>
                  <th scope="col">{copy.columns.calls}</th>
                  <th scope="col">{copy.columns.inputTokens}</th>
                  <th scope="col">{copy.columns.outputTokens}</th>
                  <th scope="col">{copy.columns.costUsd}</th>
                  <th scope="col">{copy.columns.lastAt}</th>
                  <th scope="col">
                    <span className="sr-only">{copy.viewTraces}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.userId}>
                    <td className="font-semibold text-navy">{nameOf(user)}</td>
                    <td>{user.email ?? '—'}</td>
                    <td className="tabular-nums">{count.format(user.conversations)}</td>
                    <td className="tabular-nums">{count.format(user.calls)}</td>
                    <td className="tabular-nums">{count.format(user.inputTokens)}</td>
                    <td className="tabular-nums">{count.format(user.outputTokens)}</td>
                    <td className="font-semibold tabular-nums">{formatUsd(user.costUsd)}</td>
                    <td>{formatDateTime(user.lastAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-teal-ink hover:bg-teal-soft"
                        onClick={() => onOpenTraces({ userId: user.userId, name: nameOf(user) })}
                      >
                        {copy.viewTraces}
                      </button>
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
              disabled={page <= 1 || users.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              {copy.previous}
            </button>
            <span>{t('aiUsage.userBoard.pageOf', { page, pageCount })}</span>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
              disabled={page >= pageCount || users.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              {copy.next}
            </button>
          </nav>
        </>
      )}
    </Panel>
  );
}
