'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime } from '../ui/format';
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton } from '../ui/primitives';

const text = vi.moderation;
const decisionLabels: Record<string, string> = {
  hide: 'Ẩn',
  auto_hide: 'Tự động ẩn',
  remove: 'Gỡ',
  restore: 'Khôi phục',
  dismiss: 'Bỏ qua',
};
const targetStatusLabels: Record<string, string> = {
  held: vi.api.moderationHeld,
  hidden: 'Đang ẩn',
  removed: 'Đã gỡ',
  visible: 'Đang hiển thị',
  published: 'Đã công khai',
  draft: 'Bản nháp',
};

function LoadingRows() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

export function AppealQueue() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'appeals'],
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
    <Card aria-label="Hàng chờ khiếu nại">
      <CardHeader
        icon="comment"
        title="Khiếu nại đang chờ"
        hint="Đối chiếu quyết định gốc và nội dung hiện tại trước khi xét lại."
        action={<Badge>{items.length} hồ sơ đã tải</Badge>}
      />
      {query.isPending && <LoadingRows />}
      <AdminApiError error={query.error ?? decision.error} />
      {!query.isPending && !query.error && !items.length && (
        <EmptyState icon="check" title="Không có khiếu nại đang chờ." />
      )}
      <ul className="flex flex-col gap-3 px-5 pb-5">
        {items.map(({ appeal, decision: original, targetText, targetStatus }) => {
          const isOwnDecision = original.moderatorId === user?.id;
          return (
            <li key={appeal.id}>
              <article className="rounded-xl border border-border p-4">
                <header className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold">{original.targetType === 'post' ? 'Bài viết' : 'Bình luận'}</h3>
                  <Badge tone="sun" hasDot>
                    Chờ xét lại
                  </Badge>
                  <time className="ml-auto text-xs text-text-muted" dateTime={appeal.createdAt}>
                    {formatDateTime(appeal.createdAt)}
                  </time>
                </header>
                <p className="mt-1 text-xs text-text-muted">
                  Quyết định: {decisionLabels[original.action] ?? original.action} · Lý do:{' '}
                  {text.reasons[original.reasonCode as keyof typeof text.reasons] ?? original.reasonCode}
                </p>
                <div className="mt-3 rounded-lg bg-warm-mist px-3 py-2 text-sm">
                  <strong className="block text-xs text-coral-ink">Nội dung khiếu nại</strong>
                  <p className="mt-0.5 whitespace-pre-wrap">{appeal.reason}</p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <section className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-bold text-text-muted">Bằng chứng lúc quyết định</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {typeof original.evidenceSnapshot?.text === 'string'
                        ? original.evidenceSnapshot.text
                        : 'Quyết định cũ chưa lưu snapshot'}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Chính sách: {original.policyVersion ?? 'Chưa ghi phiên bản'}
                    </p>
                  </section>
                  <section className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-bold text-text-muted">Nội dung hiện tại</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{targetText ?? 'Không khả dụng'}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Trạng thái: {targetStatusLabels[targetStatus ?? ''] ?? 'Không khả dụng'}
                    </p>
                  </section>
                </div>
                <p className="mt-2 font-mono text-[11px] text-text-subtle">
                  Mã bài viết: {original.postId}
                  {original.commentId ? ` · Bình luận: ${original.commentId}` : ''}
                </p>
                {!original.contentVersion && (
                  <p className="mt-2 text-xs text-coral-ink">Quyết định cũ thiếu phiên bản nội dung; cần xử lý thủ công.</p>
                )}
                {isOwnDecision && (
                  <p className="mt-2 text-xs text-coral-ink">
                    Bạn đã ra quyết định gốc. Cần một kiểm duyệt viên khác xét khiếu nại này.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    disabled={decision.isPending || isOwnDecision}
                    onClick={() => decision.mutate({ id: appeal.id, outcome: 'upheld' })}
                  >
                    Giữ quyết định
                  </Button>
                  <Button
                    variant="accent"
                    disabled={decision.isPending || !original.contentVersion || isOwnDecision}
                    onClick={() => {
                      if (window.confirm('Chấp nhận khiếu nại và khôi phục nội dung nếu còn đủ điều kiện?'))
                        decision.mutate({ id: appeal.id, outcome: 'overturned' });
                    }}
                  >
                    Chấp nhận khiếu nại
                  </Button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage && (
        <footer className="flex justify-center border-t border-border px-5 py-3">
          <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            Xem thêm
          </Button>
        </footer>
      )}
    </Card>
  );
}

export function FailedScans() {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'failed-scans'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.failedScans(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const retry = useMutation({
    mutationFn: (id: string) => moderationApi.retryScan(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['moderation'] }),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Card aria-label="Scan cần phục hồi">
      <CardHeader
        icon="refresh"
        title="Scan cần phục hồi"
        hint="Các lượt kiểm tra đã hết số lần tự động thử lại."
        action={<Badge>{items.length} scan đã tải</Badge>}
      />
      <p className="mx-5 mb-3 rounded-lg bg-sun-soft px-3 py-2 text-xs text-ink">
        Kiểm tra AI đã hoạt động trước khi lên lịch thử lại. Hệ thống vẫn kiểm tra phiên bản và quyết định của
        moderator.
      </p>
      {query.isPending && <LoadingRows />}
      <AdminApiError error={query.error ?? retry.error} />
      {retry.isSuccess && (
        <output className="mx-5 mb-3 block rounded-lg bg-teal-soft px-3 py-2 text-xs font-semibold text-teal-ink">
          Đã lên lịch kiểm tra lại nội dung.
        </output>
      )}
      {!query.isPending && !query.error && !items.length && (
        <EmptyState icon="check" title="Không có scan cần phục hồi." />
      )}
      <ul className="flex flex-col gap-2 px-5 pb-5">
        {items.map((item) => (
          <li key={item.eventId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{item.targetType === 'post' ? 'Bài viết' : 'Bình luận'}</h3>
                <Badge tone="danger" hasDot>
                  Hết lượt tự thử
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-text-muted">
                ID nội dung: <code>{item.targetId}</code>
              </p>
              <p className="text-xs text-text-muted">
                {item.attempts} lần thử · Cập nhật {formatDateTime(item.updatedAt)}
              </p>
            </div>
            <Button icon="refresh" disabled={retry.isPending} onClick={() => retry.mutate(item.eventId)}>
              {retry.isPending && retry.variables === item.eventId ? 'Đang lên lịch…' : 'Lên lịch thử lại'}
            </Button>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <footer className="flex justify-center border-t border-border px-5 py-3">
          <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
          </Button>
        </footer>
      )}
    </Card>
  );
}
