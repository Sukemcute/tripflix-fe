'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { LoadMore } from '@/ui/pagination';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { REFRESH_MS, formatDateTime } from './moderation-shared';

const text = vi.moderation;
const copy = vi.moderationConsole.scans;

/** Các lượt scan đã hết số lần tự thử lại; moderator lên lịch thử lại từng lượt. */
export function FailedScans() {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'failed-scans'],
    refetchInterval: REFRESH_MS,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.failedScans(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const retry = useMutation({
    mutationFn: (id: string) => moderationApi.retryScan(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['moderation', 'failed-scans'] }),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-text-muted">{copy.hint}</p>
      {query.isPending && <LoadingState rows={3} />}
      <AdminApiError error={query.error ?? retry.error} />
      {retry.isSuccess && <output className="block text-[13px] text-teal-ink">{copy.scheduled}</output>}
      {!query.isPending && !query.error && !items.length && <EmptyState title={copy.empty} />}
      {items.length > 0 && (
        <ul className="divide-y divide-border border-y border-border" aria-label={copy.title}>
          {items.map((item) => (
            <li key={item.eventId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">
                    {item.partKind === 'image'
                      ? text.parts.image
                      : item.partKind === 'caption'
                        ? text.parts.caption
                        : item.targetType === 'post'
                          ? vi.moderationConsole.postKind
                          : vi.moderationConsole.commentKind}
                  </span>
                  <StatusBadge tone="danger">{copy.exhausted}</StatusBadge>
                </div>
                <p className="font-mono text-xs break-all text-text-muted">
                  {copy.targetId}: {item.targetId}
                </p>
                {item.assetId && (
                  <p className="font-mono text-xs break-all text-text-muted">
                    {text.parts.asset}: {item.assetId}
                  </p>
                )}
                <p className="text-xs text-text-muted">
                  {t('moderationConsole.scans.attempts', { count: item.attempts })} · {copy.updated}{' '}
                  {formatDateTime(item.updatedAt)}
                </p>
              </div>
              <AdminButton disabled={retry.isPending} onClick={() => retry.mutate(item.eventId)}>
                {retry.isPending && retry.variables === item.eventId ? copy.retrying : copy.retry}
              </AdminButton>
            </li>
          ))}
        </ul>
      )}
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
