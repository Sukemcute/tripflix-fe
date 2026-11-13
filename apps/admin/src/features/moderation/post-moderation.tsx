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
import styles from './post-moderation.module.css';

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
  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className={`admin-data ${styles.root}`} aria-label="Quản lý bài viết">
      <header className={styles.heading}>
        <div>
          <h2>Quản lý bài viết</h2>
          <p>Xem nội dung, kiểm tra lý do và xử lý bài viết trong cùng một nơi.</p>
        </div>
        <span className={styles.count}>{posts.length} bài đã tải</span>
      </header>
      <div className={`admin-filters ${styles.filters}`}>
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
          type="button"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          {query.isRefetching ? 'Đang làm mới…' : vi.api.refresh}
        </button>
      </div>
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output className={styles.loading}>{vi.api.loading}</output>}
      <section className="admin-table-scroll" aria-label="Danh sách bài viết">
        <table className={styles.table} aria-busy={query.isPending}>
          <caption className={styles.srOnly}>Danh sách bài viết theo trạng thái đã chọn</caption>
          <colgroup>
            <col className={styles.titleColumn} />
            <col className={styles.authorColumn} />
            <col className={styles.statusColumn} />
            <col className={styles.actionColumn} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{vi.api.title}</th>
              <th scope="col">{vi.api.author}</th>
              <th scope="col">{vi.api.status}</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!query.isPending && !query.error && !posts.length && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  <strong>Không có bài viết ở trạng thái này</strong>
                  <p>Thử chọn trạng thái khác hoặc làm mới danh sách.</p>
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} data-selected={selected === post.id}>
                <td>
                  <span className={styles.postTitle}>{post.title}</span>
                  <span className={styles.metadata}>
                    {post.post_type === 'video' ? 'Video / Reel' : 'Vlog'}
                    <span aria-hidden="true"> · </span>
                    {new Date(post.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </td>
                <td aria-label={post.author.display_name}>
                  <div className={styles.author}>
                    <span className={styles.avatar} aria-hidden="true">
                      {Array.from(post.author.display_name.trim())[0]?.toUpperCase() || 'T'}
                    </span>
                    <span>{post.author.display_name}</span>
                  </div>
                </td>
                <td>
                  <span className={styles.status} data-status={post.status}>
                    <span className={styles.dot} aria-hidden="true" />
                    {vi.api[post.status as AdminPostsControllerListAdminPostsStatus] ?? post.status}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.detailButton}
                    aria-expanded={selected === post.id}
                    aria-controls={selected === post.id ? 'moderation-selected-post' : undefined}
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
      </section>
      <footer className={styles.footer}>
        <span>
          Đã tải {posts.length} bài viết{query.hasNextPage ? ' · Còn bài viết khác' : ''}
        </span>
        {query.hasNextPage && (
          <button
            type="button"
            className="admin-secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => {
              void query.fetchNextPage();
            }}
          >
            {query.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm bài viết'}
          </button>
        )}
      </footer>
      {selected && (
        <section
          id="moderation-selected-post"
          ref={detailRef}
          className="admin-post-review"
          aria-label={vi.api.moderationPostLabel}
        >
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
    </section>
  );
}
