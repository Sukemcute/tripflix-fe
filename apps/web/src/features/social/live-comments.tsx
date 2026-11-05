'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { CommunitySummary } from './post-summary';
import { getInitial } from '@/features/auth/account-helpers';

/**
 * Bình luận của một bài (hoặc trả lời của một bình luận khi có parentCommentId).
 * Ô viết ở trên danh sách; sửa ngay tại bình luận; trả lời thụt vào một bậc.
 */
export function LiveComments({ postId, parentCommentId }: { postId: string; parentCommentId?: string }) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [replying, setReplying] = useState<string | undefined>();
  const query = useInfiniteQuery({
    queryKey: ['social', 'comments', postId, parentCommentId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(postId, pageParam, parentCommentId, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const mutation = useMutation({
    mutationFn: async (
      action: { type: 'add' } | { type: 'edit'; id: string } | { type: 'delete'; id: string },
    ) =>
      action.type === 'delete'
        ? socialApi.deleteComment(action.id)
        : action.type === 'edit'
          ? socialApi.editComment(action.id, editBody.trim())
          : socialApi.addComment(postId, body.trim(), parentCommentId),
    onSuccess: async (_, action) => {
      if (action.type === 'add') setBody('');
      if (action.type === 'edit') setEditing(null);
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  const comments = query.data?.pages.flatMap((page) => page.items) ?? [];
  const writeLabel = parentCommentId ? vi.api.reply : vi.api.commentBody;
  const loginHref = `/login?returnTo=${encodeURIComponent(`/trips/${postId}`)}`;

  return (
    <div className={parentCommentId ? 'comment-thread is-reply' : 'comment-thread'}>
      {!parentCommentId && <CommunitySummary key={postId} postId={postId} />}
      {/* Đang sửa một bình luận thì ẩn ô viết mới, để trên trang chỉ có một nút "Gửi". */}
      {user && editing ? null : user ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ type: 'add' });
          }}
        >
          <span className="post-avatar" aria-hidden="true">
            {getInitial(user.displayName)}
          </span>
          <div className="comment-form-body">
            <textarea
              aria-label={writeLabel}
              placeholder={writeLabel}
              rows={parentCommentId ? 2 : 3}
              value={body}
              maxLength={10000}
              onChange={(event) => setBody(event.target.value)}
            />
            <button className="primary-button" disabled={mutation.isPending || !body.trim()}>
              {vi.api.send}
            </button>
          </div>
        </form>
      ) : (
        !parentCommentId && (
          <Link className="comment-login" href={loginHref}>
            {vi.api.commentLogin}
          </Link>
        )
      )}
      <ApiErrorNotice error={mutation.error} />
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output className="comment-empty">{vi.api.loading}</output>}
      {query.isSuccess && comments.length === 0 && !parentCommentId && (
        <p className="comment-empty">{vi.api.noComments}</p>
      )}
      <ol className="comment-list">
        {comments.map((comment) => {
          const isMine = comment.authorId === user?.id;
          const name = isMine ? (user?.displayName ?? vi.api.postYou) : vi.api.commentMember;
          return (
            <li key={comment.id}>
              <article className="comment">
                <span className="post-avatar" aria-hidden="true">
                  {getInitial(name)}
                </span>
                <div className="comment-body">
                  <p className="comment-meta">
                    <strong>{name}</strong>
                    {!isMine && <span>{comment.authorId.slice(0, 8)}</span>}
                    <span>{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
                    {comment.isEdited && <span>{vi.api.commentEdited}</span>}
                  </p>
                  {editing === comment.id ? (
                    <form
                      className="comment-edit"
                      onSubmit={(event) => {
                        event.preventDefault();
                        mutation.mutate({ type: 'edit', id: comment.id });
                      }}
                    >
                      <textarea
                        aria-label={vi.api.edit}
                        rows={3}
                        value={editBody}
                        maxLength={10000}
                        onChange={(event) => setEditBody(event.target.value)}
                      />
                      <div className="comment-actions">
                        <button className="primary-button" disabled={mutation.isPending || !editBody.trim()}>
                          {vi.api.send}
                        </button>
                        <button type="button" className="comment-link" onClick={() => setEditing(null)}>
                          {vi.api.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="comment-text">{comment.body}</p>
                  )}
                  {editing !== comment.id && (
                    <div className="comment-actions">
                      {!parentCommentId && (
                        <button
                          type="button"
                          className="comment-link"
                          aria-expanded={replying === comment.id}
                          onClick={() => setReplying(replying === comment.id ? undefined : comment.id)}
                        >
                          {replying === comment.id ? vi.api.hideReplies : vi.api.replies}
                        </button>
                      )}
                      {isMine && (
                        <>
                          <button
                            type="button"
                            className="comment-link"
                            disabled={mutation.isPending}
                            onClick={() => {
                              setEditing(comment.id);
                              setEditBody(comment.body);
                            }}
                          >
                            {vi.api.edit}
                          </button>
                          <button
                            type="button"
                            className="comment-link is-danger"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ type: 'delete', id: comment.id })}
                          >
                            {vi.api.remove}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {replying === comment.id && <LiveComments postId={postId} parentCommentId={comment.id} />}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
      {query.hasNextPage && (
        <button
          type="button"
          className="secondary-button comment-more"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </button>
      )}
    </div>
  );
}
