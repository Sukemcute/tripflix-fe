'use client';
import { socialApi } from '@tripflix/api-client';
import type {
  AdminPostsControllerListAdminPostsStatus,
  AdminSocialPostDto,
  CreateModerationActionDtoAction,
} from '@tripflix/api-client/core-api/model/index';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminButton } from '@/ui/button';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { DetailDrawer } from '@/ui/detail-drawer';
import { FilterToolbar, SelectField } from '@/ui/filter-toolbar';
import { LoadMore } from '@/ui/pagination';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { readEnumParam } from '@/ui/url-params';
import { buildDrawerNavigation, useDetailParam } from '@/ui/use-detail-param';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import {
  ALLOWED_POST_ACTIONS,
  POST_ACTIONS,
  ModerationPostDetail,
  postStatusLabel,
  postStatusTone,
  type PostStatus,
} from './moderation-post-detail';

const copy = vi.moderationConsole.postsTab;
const STATUSES = ['draft', 'published', 'held', 'hidden', 'removed', 'deleted'] as const;
const STATUS_FILTERS = ['', ...STATUSES] as const;

const columns: DataColumn<AdminSocialPostDto>[] = [
  {
    id: 'title',
    header: copy.columns.title,
    openLabel: (post) => `${vi.api.detail}: ${post.title}`,
    cell: (post) => (
      <>
        <span className="block">{post.title}</span>
        <span className="block text-xs text-text-muted">
          {post.post_type === 'video' ? copy.video : copy.vlog}
        </span>
      </>
    ),
  },
  { id: 'author', header: copy.columns.author, hideBelow: 'sm', cell: (post) => post.author.display_name },
  {
    id: 'status',
    header: copy.columns.status,
    cell: (post) => <StatusBadge tone={postStatusTone(post.status)}>{postStatusLabel(post.status)}</StatusBadge>,
  },
  {
    id: 'created',
    header: copy.columns.created,
    hideBelow: 'md',
    cell: (post) => <span className="whitespace-nowrap">{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>,
  },
];

/** Danh sách bài viết để kiểm duyệt; bấm một bài mở drawer chi tiết + xử lý (`?id=`). */
export function PostModeration() {
  const client = useQueryClient();
  const { params, update } = useUrlParams();
  const { openId, open, close } = useDetailParam();
  const status = readEnumParam(params.get('status'), STATUS_FILTERS, '');
  const [form, setForm] = useState({ postId: '', reason: '' });
  const reason = form.postId === openId ? form.reason : '';

  const query = useInfiniteQuery({
    queryKey: ['admin-posts', status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      socialApi.listAdminPosts({ cursor: pageParam, status: (status || undefined) as AdminPostsControllerListAdminPostsStatus | undefined }, signal),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    refetchInterval: 30_000,
  });
  const detail = useQuery({
    queryKey: ['admin-posts', 'detail', openId],
    enabled: !!openId,
    queryFn: ({ signal }) => socialApi.getAdminPost(openId ?? '', signal),
  });
  const mutation = useMutation({
    mutationFn: (action: CreateModerationActionDtoAction) =>
      socialApi.moderatePost(openId ?? '', { action, reason_code: reason.trim() }),
    onSuccess: async () => {
      setForm({ postId: '', reason: '' });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-posts'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['moderation'] }),
      ]);
    },
  });
  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];
  const post = detail.data;
  const postStatus = post?.status as PostStatus | undefined;
  const isLocked = postStatus === 'deleted' || postStatus === 'draft';

  return (
    <div className="space-y-3">
      <FilterToolbar
        hasActiveFilters={!!status}
        onReset={() => {
          update({ status: null, id: null });
        }}
        actions={
          <AdminButton disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isRefetching ? copy.refreshing : copy.refresh}
          </AdminButton>
        }
      >
        <SelectField
          label={copy.statusLabel}
          value={status}
          allLabel={vi.api.all}
          options={STATUSES.map((value) => ({ value, label: postStatusLabel(value) }))}
          onChange={(value) => {
            mutation.reset();
            update({ status: value, id: null });
          }}
        />
      </FilterToolbar>
      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      <DataTable
        label={copy.table}
        columns={columns}
        rows={posts}
        getRowId={(item) => item.id}
        onRowOpen={(item) => {
          mutation.reset();
          open(item.id);
        }}
        selectedId={openId}
        isLoading={query.isPending}
        empty={!query.error && <EmptyState title={copy.empty} description={copy.emptyHint} />}
      />
      {posts.length > 0 && (
        <LoadMore
          shown={posts.length}
          hasMore={!!query.hasNextPage}
          isFetching={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
      {openId && (
        <DetailDrawer
          size="wide"
          title={post?.title ?? openId.slice(0, 8)}
          status={post && <StatusBadge tone={postStatusTone(post.status)}>{postStatusLabel(post.status)}</StatusBadge>}
          subtitle={post?.author.display_name}
          navigation={buildDrawerNavigation(posts.map((item) => item.id), openId, (id) => {
            mutation.reset();
            open(id);
          })}
          isDirty={!!reason}
          scrollKey={openId}
          onClose={() => {
            mutation.reset();
            close();
          }}
          footer={
            post && (
              <div className="w-full space-y-2">
                {postStatus === 'deleted' && <p className="text-[13px] text-text-muted">{copy.deletedNote}</p>}
                {postStatus === 'draft' && <p className="text-[13px] text-text-muted">{copy.draftNote}</p>}
                <AdminApiError error={mutation.error} />
                {mutation.isSuccess && <output className="block text-[13px] text-teal-ink">{vi.api.saved}</output>}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <SelectField
                    label={vi.api.reason}
                    value={reason}
                    allLabel={copy.reasonPlaceholder}
                    options={Object.entries(vi.moderation.reasons).map(([code, label]) => ({ value: code, label }))}
                    onChange={(value) => setForm({ postId: openId, reason: value })}
                  />
                  {POST_ACTIONS.map((action) => (
                    <AdminButton
                      key={action}
                      variant={action === 'remove' ? 'danger' : 'secondary'}
                      disabled={
                        mutation.isPending ||
                        isLocked ||
                        !reason.trim() ||
                        !ALLOWED_POST_ACTIONS[postStatus ?? '']?.includes(action)
                      }
                      onClick={() => mutation.mutate(action)}
                    >
                      {postStatus === 'held' && action === 'restore' ? vi.api.moderationReleaseHeld : vi.api[action]}
                    </AdminButton>
                  ))}
                </div>
              </div>
            )
          }
        >
          <AdminApiError error={detail.error} retry={() => void detail.refetch()} />
          {detail.isPending && <LoadingState rows={5} />}
          {post && <ModerationPostDetail post={post} />}
        </DetailDrawer>
      )}
    </div>
  );
}
