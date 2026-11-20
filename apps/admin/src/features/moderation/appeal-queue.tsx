'use client';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { ConfirmDialog } from '@/ui/dialog';
import { LoadMore } from '@/ui/pagination';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { REFRESH_MS, formatDateTime } from './moderation-shared';

const text = vi.moderation;
const copy = vi.moderationConsole.appeals;
const targetStatusLabel = (status: string | null | undefined) =>
  status === 'held'
    ? vi.api.moderationHeld
    : (copy.targetStatuses[(status ?? '') as keyof typeof copy.targetStatuses] ?? copy.unavailable);

/** Khiếu nại đang chờ: đối chiếu quyết định gốc với nội dung hiện tại rồi giữ hoặc chấp nhận. */
export function AppealQueue() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [overturnId, setOverturnId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'appeals'],
    refetchInterval: REFRESH_MS,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.appeals(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const decision = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'upheld' | 'overturned' }) =>
      moderationApi.decideAppeal(id, outcome),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-text-muted">{copy.hint}</p>
      {query.isPending && <LoadingState rows={3} />}
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      <AdminApiError error={decision.error} />
      {!query.isPending && !query.error && !items.length && <EmptyState title={copy.empty} />}
      {items.length > 0 && (
        <ul className="divide-y divide-border border-y border-border" aria-label={copy.title}>
          {items.map(({ appeal, decision: original, targetText, targetStatus }) => {
            const isOwnDecision = original.moderatorId === user?.id;
            return (
              <li key={appeal.id} className="space-y-3 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {original.targetType === 'post' ? vi.moderationConsole.postKind : vi.moderationConsole.commentKind}
                  </h3>
                  <StatusBadge tone="warning">{copy.waiting}</StatusBadge>
                  <time className="text-xs text-text-muted" dateTime={appeal.createdAt}>
                    {formatDateTime(appeal.createdAt)}
                  </time>
                </div>
                <p className="text-[13px] text-text-muted">
                  {copy.decision}: {copy.actions[original.action as keyof typeof copy.actions] ?? original.action} ·{' '}
                  {copy.reasonPrefix}: {text.reasons[original.reasonCode as keyof typeof text.reasons] ?? original.reasonCode}
                </p>
                <div>
                  <p className="text-xs text-text-muted">{copy.appealText}</p>
                  <p className="text-[13px] break-words whitespace-pre-wrap">{appeal.reason}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-text-muted">{copy.evidence}</p>
                    <p className="text-[13px] break-words">
                      {typeof original.evidenceSnapshot?.text === 'string'
                        ? original.evidenceSnapshot.text
                        : copy.noSnapshot}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {copy.policy}: {original.policyVersion ?? copy.noPolicy}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">{copy.current}</p>
                    <p className="text-[13px] break-words">{targetText ?? copy.unavailable}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {copy.status}: {targetStatusLabel(targetStatus)}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-xs break-all text-text-muted">
                  {copy.postId}: {original.postId}
                  {original.commentId ? ` · ${copy.commentId}: ${original.commentId}` : ''}
                </p>
                {!original.contentVersion && <p className="text-[13px] text-coral-ink">{copy.missingVersion}</p>}
                {isOwnDecision && <p className="text-[13px] text-coral-ink">{copy.ownDecision}</p>}
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    disabled={decision.isPending || isOwnDecision}
                    onClick={() => decision.mutate({ id: appeal.id, outcome: 'upheld' })}
                  >
                    {copy.uphold}
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    disabled={decision.isPending || !original.contentVersion || isOwnDecision}
                    onClick={() => setOverturnId(appeal.id)}
                  >
                    {copy.overturn}
                  </AdminButton>
                </div>
              </li>
            );
          })}
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
      {overturnId && (
        <ConfirmDialog
          title={copy.overturnTitle}
          description={copy.overturnBody}
          confirmLabel={copy.overturn}
          isPending={decision.isPending}
          onClose={() => setOverturnId(null)}
          onConfirm={() => {
            decision.mutate({ id: overturnId, outcome: 'overturned' });
            setOverturnId(null);
          }}
        />
      )}
      <p className="sr-only">{t('moderationConsole.appeals.loaded', { count: items.length })}</p>
    </div>
  );
}
