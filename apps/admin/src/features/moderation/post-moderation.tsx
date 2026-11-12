'use client';
import { socialApi } from '@tripflix/api-client';
import type {
  AdminPostsControllerListAdminPostsStatus,
  CreateModerationActionDtoAction,
} from '@tripflix/api-client/core-api/model/index';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useEffect, useRef, useState } from 'react';
import { AdminApiError } from '../shell/api-state';
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
  // Bấm "Xem chi tiết" ở bảng thì cuộn tới khung bài khi bài đã tải xong (cuộn sớm hơn thì khung còn trống, bị lệch).
  // Chỉ cuộn một lần cho mỗi bài: tải lại sau khi ẩn/khôi phục không làm trang nhảy.
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
      ]);
    },
  });
  return (
    <>
      <div className="admin-filters">
        <label>
          {vi.api.status}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setSelected('');
              mutation.reset();
            }}
          >
            <option value="">{vi.api.all}</option>
            {(['draft', 'published', 'hidden', 'removed', 'deleted'] as const).map((value) => (
              <option key={value} value={value}>
                {vi.api[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="admin-secondary"
          onClick={() => {
            void query.refetch();
          }}
        >
          {vi.api.refresh}
        </button>
      </div>
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output>{vi.api.loading}</output>}
      {query.data?.pages[0]?.items.length === 0 && <p className="admin-empty">{vi.api.empty}</p>}
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{vi.api.title}</th>
              <th>{vi.api.author}</th>
              <th>{vi.api.status}</th>
              <th>{vi.api.detail}</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.pages
              .flatMap((page) => page.items)
              .map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.author.display_name}</td>
                  <td>{vi.api[post.status as AdminPostsControllerListAdminPostsStatus] ?? post.status}</td>
                  <td>
                    <button
                      className="admin-text-button"
                      onClick={() => {
                        setSelected(post.id);
                        setReason('');
                        mutation.reset();
                      }}
                    >
                      {vi.api.detail}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {query.hasNextPage && (
        <button
          className="admin-secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </button>
      )}
      {selected && (
        <section ref={detailRef} className="admin-post-review" aria-label={vi.api.moderationPostLabel}>
          <div className="admin-post-review-bar">
            <p className="admin-eyebrow">{vi.api.moderationPostLabel}</p>
            <button type="button" className="admin-secondary" onClick={() => setSelected('')}>
              {vi.api.close}
            </button>
          </div>
          <AdminApiError
            error={detail.error}
            retry={() => {
              void detail.refetch();
            }}
          />
          {detail.isPending && <output>{vi.api.loading}</output>}
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
                  {mutation.isSuccess && <output className="admin-post-saved">{vi.api.saved}</output>}
                </>
              }
            />
          )}
        </section>
      )}
    </>
  );
}
