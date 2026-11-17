'use client';
import { socialApi } from '@tripflix/api-client';
import type {
  AdminPostsControllerListAdminPostsStatus,
  CreateModerationActionDtoAction,
} from '@tripflix/api-client/core-api/model/index';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import { useEffect, useRef, useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime } from '../ui/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Skeleton,
  controlClass,
  fieldLabelClass,
  tableClass,
  tdClass,
  thClass,
} from '../ui/primitives';
import { POST_STATUS_TONE, postStatusLabel } from './post-status';
import { ModerationPostDetail } from './moderation-post-detail';

export function PostModeration() {
  const client = useQueryClient();
  const [status, setStatus] = useState<AdminPostsControllerListAdminPostsStatus | ''>('');
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  const query = useInfiniteQuery({
    queryKey: ['admin-posts', status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      socialApi.listAdminPosts({ cursor: pageParam, status: status || undefined }, signal),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const detail = useQuery({
    queryKey: ['admin-posts', 'detail', selected],
    enabled: !!selected,
    queryFn: ({ signal }) => socialApi.getAdminPost(selected, signal),
  });
  // Bấm "Xem chi tiết" thì cuộn tới khung bài khi bài đã tải xong; tải lại sau khi xử lý không làm trang nhảy.
  const loadedId = detail.data?.id;
  useEffect(() => {
    if (loadedId) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loadedId]);
  const mutation = useMutation({
    mutationFn: (action: CreateModerationActionDtoAction) =>
      socialApi.moderatePost(selected, { action, reason_code: reason.trim() }),
    onSuccess: async () => {
      setReason('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-posts'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['moderation'] }),
      ]);
    },
  });
  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Card aria-label="Quản lý bài viết">
        <CardHeader
          icon="image"
          title="Quản lý bài viết"
          hint="Xem nội dung, kiểm tra lý do và xử lý bài viết trong cùng một nơi."
          action={<Badge>{posts.length} bài đã tải</Badge>}
        />
        <div className="flex flex-wrap items-end gap-3 border-y border-border bg-surface px-5 py-3">
          <label className={`${fieldLabelClass} w-48`}>
            {vi.api.status}
            <select
              className={controlClass}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setSelected('');
                mutation.reset();
              }}
            >
              <option value="">{vi.api.all}</option>
              {(['draft', 'published', 'held', 'hidden', 'removed', 'deleted'] as const).map((value) => (
                <option key={value} value={value}>
                  {postStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <Button icon="refresh" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isRefetching ? 'Đang làm mới…' : vi.api.refresh}
          </Button>
        </div>
        <AdminApiError error={query.error} retry={() => void query.refetch()} />
        {query.isPending && (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        <section className="overflow-x-auto" aria-label="Danh sách bài viết">
          <table className={tableClass} aria-busy={query.isPending}>
            <caption className="sr-only">Danh sách bài viết theo trạng thái đã chọn</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>
                  {vi.api.title}
                </th>
                <th scope="col" className={thClass}>
                  {vi.api.author}
                </th>
                <th scope="col" className={thClass}>
                  {vi.api.status}
                </th>
                <th scope="col" className={thClass}>
                  {vi.moderation.reportCount}
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {!query.isPending && !query.error && !posts.length && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="Không có bài viết ở trạng thái này"
                      body="Thử chọn trạng thái khác hoặc làm mới danh sách."
                    />
                  </td>
                </tr>
              )}
              {posts.map((post) => (
                <tr key={post.id} className={cn('hover:bg-surface', selected === post.id && 'bg-teal-soft/50')}>
                  <td className={tdClass}>
                    <span className="block font-semibold text-text">{post.title}</span>
                    <span className="text-xs text-text-muted">
                      {post.post_type === 'video' ? 'Video / Reel' : 'Vlog'} · {formatDateTime(post.created_at)}
                    </span>
                  </td>
                  <td className={tdClass} aria-label={post.author.display_name}>
                    <span className="flex items-center gap-2">
                      <span
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy"
                        aria-hidden="true"
                      >
                        {Array.from(post.author.display_name.trim())[0]?.toUpperCase() || 'T'}
                      </span>
                      <span>{post.author.display_name}</span>
                    </span>
                  </td>
                  <td className={tdClass}>
                    <Badge tone={POST_STATUS_TONE[post.status] ?? 'neutral'} hasDot>
                      {postStatusLabel(post.status)}
                    </Badge>
                  </td>
                  <td className={`${tdClass} tabular-nums`}>
                    <span className={post.report_count > 0 ? 'font-bold text-danger' : 'text-text-muted'}>
                      {post.report_count}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <Button
                      size="sm"
                      aria-expanded={selected === post.id}
                      aria-controls={selected === post.id ? 'moderation-selected-post' : undefined}
                      onClick={() => {
                        setSelected(post.id);
                        setReason('');
                        mutation.reset();
                      }}
                    >
                      {vi.api.detail}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-text-muted">
          <span>
            Đã tải {posts.length} bài viết{query.hasNextPage ? ' · Còn bài viết khác' : ''}
          </span>
          {query.hasNextPage && (
            <Button size="sm" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
              {query.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm bài viết'}
            </Button>
          )}
        </footer>
      </Card>

      {selected && (
        <Card
          id="moderation-selected-post"
          ref={detailRef}
          aria-label={vi.api.moderationPostLabel}
          className="scroll-mt-20 p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-text-muted uppercase">{vi.api.moderationPostLabel}</p>
            <Button size="sm" onClick={() => setSelected('')}>
              {vi.api.close}
            </Button>
          </div>
          <AdminApiError error={detail.error} retry={() => void detail.refetch()} />
          {detail.isPending && <Skeleton className="h-64" />}
          {detail.data && (
            <ModerationPostDetail
              post={detail.data}
              reason={reason}
              onReasonChange={setReason}
              onAction={(action) => mutation.mutate(action)}
              isPending={mutation.isPending}
              notice={
                <>
                  <AdminApiError error={mutation.error} />
                  {mutation.isSuccess && (
                    <output className="block rounded-lg bg-teal-soft px-3 py-2 text-xs font-semibold text-teal-ink">
                      {vi.api.saved}
                    </output>
                  )}
                </>
              }
            />
          )}
        </Card>
      )}
    </div>
  );
}
