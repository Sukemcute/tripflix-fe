'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import type { ModerationLogDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { LoadMore } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime } from './moderation-shared';

const text = vi.moderation;
const copy = vi.moderationConsole.log;

const actionTone: Record<string, StatusTone> = {
  hide: 'warning',
  auto_hide: 'warning',
  restore: 'success',
  remove: 'danger',
  dismiss: 'neutral',
};

const columns: DataColumn<ModerationLogDto>[] = [
  {
    id: 'time',
    header: text.time,
    cell: (action) => (
      <time dateTime={action.createdAt} className="whitespace-nowrap">
        {formatDateTime(action.createdAt)}
      </time>
    ),
  },
  {
    id: 'staff',
    header: text.staff,
    hideBelow: 'md',
    cell: (action) => (
      <>
        <span className="block">{action.actorType === 'system' ? copy.system : copy.staff}</span>
        {action.actorType !== 'system' && (
          <code className="font-mono text-xs text-text-muted" title={action.moderatorId}>
            {action.moderatorId?.slice(0, 8) || copy.unknownActor}
          </code>
        )}
      </>
    ),
  },
  {
    id: 'action',
    header: text.action,
    cell: (action) => (
      <StatusBadge tone={actionTone[action.action] ?? 'neutral'}>
        {action.action in text
          ? text[action.action as 'hide' | 'restore' | 'remove' | 'dismiss' | 'auto_hide']
          : action.action}
      </StatusBadge>
    ),
  },
  {
    id: 'reason',
    header: text.reason,
    cell: (action) => (
      <>
        {text.reasons[action.reasonCode as keyof typeof text.reasons] ?? action.reasonCode}
        {action.reasonDetail && <p className="text-xs text-text-muted">{action.reasonDetail}</p>}
      </>
    ),
  },
];

/** Bảng thao tác kiểm duyệt; dùng cho tab Nhật ký và tab Lịch sử trong drawer hồ sơ. */
export function LogTable({ items }: { items: readonly ModerationLogDto[] }) {
  return (
    <DataTable
      label={copy.label}
      columns={columns}
      rows={items}
      getRowId={(action) => action.id}
      empty={<EmptyState title={copy.empty} />}
    />
  );
}

export function ModerationLog() {
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'log', {}],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => moderationApi.log({ cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="space-y-3">
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      <DataTable
        label={copy.label}
        columns={columns}
        rows={items}
        getRowId={(action) => action.id}
        isLoading={query.isPending}
        empty={!query.error && <EmptyState title={copy.empty} />}
      />
      {items.length > 0 && (
        <LoadMore
          shown={items.length}
          hasMore={!!query.hasNextPage}
          isFetching={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
    </div>
  );
}
