'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { CommunitySummary } from './post-summary';

export function LiveComments({ postId, parentCommentId }: { postId: string; parentCommentId?: string }) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | undefined>();
  const query = useInfiniteQuery({
    queryKey: ['social', 'comments', postId, parentCommentId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(postId, pageParam, parentCommentId, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const mutation = useMutation({
    mutationFn: async (action: { type: 'save' } | { type: 'delete'; id: string }) =>
      action.type === 'delete'
        ? socialApi.deleteComment(action.id)
        : editing
          ? socialApi.editComment(editing, body.trim())
          : socialApi.addComment(postId, body.trim(), parentCommentId),
    onSuccess: async (_, action) => {
      if (action.type === 'save') {
        setBody('');
        setEditing(null);
      }
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  return (
    <>
      <h2>{parentCommentId ? vi.api.reply : vi.api.comments}</h2>
      {!parentCommentId && <CommunitySummary key={postId} postId={postId} />}
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output>{vi.api.loading}</output>}
      {query.data?.pages[0]?.items.length === 0 && <p>{vi.api.noComments}</p>}
      {query.data?.pages
        .flatMap((page) => page.items)
        .map((comment) => (
          <article key={comment.id} className="detail-section">
            <p className="small muted">
              {comment.authorId.slice(0, 8)} · {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
            </p>
            <p>{comment.body}</p>
            {comment.authorId === user?.id && (
              <>
                <button
                  className="secondary-button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setEditing(comment.id);
                    setBody(comment.body);
                  }}
                >
                  {vi.api.edit}
                </button>
                <button
                  className="secondary-button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ type: 'delete', id: comment.id })}
                >
                  {vi.api.remove}
                </button>
              </>
            )}
            {!parentCommentId && (
              <>
                <button
                  className="secondary-button"
                  onClick={() => setReplying(replying === comment.id ? undefined : comment.id)}
                >
                  {vi.api.replies}
                </button>
                {replying === comment.id && <LiveComments postId={postId} parentCommentId={comment.id} />}
              </>
            )}
          </article>
        ))}
      {query.hasNextPage && (
        <button
          className="secondary-button"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </button>
      )}
      <ApiErrorNotice error={mutation.error} />
      {user ? (
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ type: 'save' });
          }}
        >
          <label>
            {editing ? vi.api.edit : vi.api.commentBody}
            <textarea
              aria-label={editing ? vi.api.edit : vi.api.commentBody}
              value={body}
              maxLength={10000}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={mutation.isPending || !body.trim()}>
            {vi.api.send}
          </button>
          {editing && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setEditing(null);
                setBody('');
              }}
            >
              {vi.api.cancel}
            </button>
          )}
        </form>
      ) : (
        <Link href={`/login?returnTo=${encodeURIComponent(`/trips/${postId}`)}`}>{vi.api.login}</Link>
      )}
    </>
  );
}
