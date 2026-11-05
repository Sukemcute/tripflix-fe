'use client';
import { socialApi } from '@tripflix/api-client';
import type {
  AdminPostsControllerListAdminPostsStatus,
  CreateModerationActionDtoAction,
} from '@tripflix/api-client/core-api/model/index';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

export function PostModeration() {
  const client = useQueryClient();
  const [status, setStatus] = useState<AdminPostsControllerListAdminPostsStatus | ''>('');
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
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
        <section className="admin-record">
          <AdminApiError
            error={detail.error}
            retry={() => {
              void detail.refetch();
            }}
          />
          {detail.isPending && <p>{vi.api.loading}</p>}
          {detail.data && (
            <>
              <h2>{detail.data.title}</h2>
              <p>{detail.data.body}</p>
              <p>{detail.data.author.display_name}</p>
              <h3>{vi.api.history}</h3>
              {detail.data.moderation_history.map((entry) => (
                <p key={entry.action_id}>
                  {entry.action} · {entry.reason_code} · {entry.reason_detail} ·{' '}
                  {new Date(entry.created_at).toLocaleString('vi-VN')}
                </p>
              ))}
              <label>
                {vi.api.reason}
                <input
                  required
                  maxLength={200}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <AdminApiError error={mutation.error} />
              {mutation.isSuccess && <output>{vi.api.saved}</output>}
              <div className="admin-filters">
                {(['hide', 'remove', 'restore'] as const).map((action) => (
                  <button
                    key={action}
                    className="admin-secondary"
                    disabled={mutation.isPending || !reason.trim()}
                    onClick={() => mutation.mutate(action)}
                  >
                    {vi.api[action]}
                  </button>
                ))}
              </div>
            </>
          )}
          <button className="admin-secondary" onClick={() => setSelected('')}>
            {vi.api.close}
          </button>
        </section>
      )}
    </>
  );
}
