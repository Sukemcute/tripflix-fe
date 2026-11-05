'use client';
import { socialApi, useApiSession, useSocialPosts } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { LiveComments } from './live-comments';

export function PublicPosts({ kind = 'public' }: { kind?: 'public' | 'mine' | 'bookmarks' }) {
  const { isReady, user } = useApiSession();
  const query = useSocialPosts(kind);
  const posts = query.data?.pages.flatMap((page) => page.items);
  if (!isReady) return <output>{vi.api.loading}</output>;
  if (kind !== 'public' && !user) return <Link href="/login">{vi.api.loginRequired}</Link>;
  return (
    <>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output>{vi.api.loading}</output>}
      {posts?.length === 0 && (
        <p className="empty-state">{kind === 'bookmarks' ? vi.api.noBookmarks : vi.api.noPosts}</p>
      )}
      <div className="trip-grid">
        {posts?.map((post) => (
          <article key={post.id} className="trip-card">
            <div className="trip-card-body">
              <p className="eyebrow">{post.tripAttachment?.destinationName ?? vi.api.posts}</p>
              <h3>
                <Link href={`/trips/${post.id}`}>{post.title}</Link>
              </h3>
              <p>{post.body}</p>
              <p className="small muted">
                {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments}
              </p>
              <Link href={`/trips/${post.id}`} className="secondary-button">
                {vi.api.detail}
              </Link>
            </div>
          </article>
        ))}
      </div>
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
    </>
  );
}
export function LivePostDetail({ id }: { id: string }) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['social', 'post', id, user?.id],
    enabled: isReady && !!id,
    queryFn: ({ signal }) => socialApi.getPost(id, signal),
  });
  const [isDeleting, setDeleting] = useState(false);
  const mutation = useMutation({
    mutationFn: async (action: 'like' | 'love' | 'helpful' | 'save' | 'delete' | 'share' | 'publish') => {
      if (action === 'save') return socialApi.setBookmark(id, !query.data?.viewerContext.isBookmarked);
      if (action === 'delete') return socialApi.deletePost(id);
      if (action === 'publish') return socialApi.publishPost(id);
      if (action === 'share') {
        const url = window.location.href;
        if (navigator.share) await navigator.share({ title: query.data?.post.title, url });
        else await navigator.clipboard.writeText(url);
        return socialApi.sharePost(id);
      }
      return socialApi.setReaction(id, query.data?.viewerContext.myReaction === action ? null : action);
    },
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ['social'] });
      if (action === 'delete') router.push('/');
    },
  });
  const post = query.data?.post;
  const login = `/login?returnTo=${encodeURIComponent(`/trips/${id}`)}`;
  return (
    <main id="content" className="ota-container trip-detail">
      <Link href="/">{vi.api.back}</Link>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {(!isReady || query.isPending) && <output>{vi.api.loading}</output>}
      {post && (
        <>
          <p className="eyebrow">
            {vi.api.author} · {post.authorId.slice(0, 8)}
          </p>
          <h1>{post.title}</h1>
          <p className="detail-summary">{post.body}</p>
          <p className="small muted">{vi.api.noPreview}</p>
          {post.tripAttachment?.items?.map((item, index) => (
            <section key={index} className="detail-section">
              <h2>
                {item.day} · {item.title}
              </h2>
              <p>{item.location}</p>
              <p>{item.notes}</p>
            </section>
          ))}
          <p>
            {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments} · {post.bookmarkCount}{' '}
            {vi.api.bookmarks}
          </p>
          <ApiErrorNotice error={mutation.error} />
          {user ? (
            <div className="filter-bar">
              {(['like', 'love', 'helpful'] as const).map((reaction) => (
                <button
                  key={reaction}
                  className="secondary-button"
                  aria-pressed={query.data?.viewerContext.myReaction === reaction}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(reaction)}
                >
                  {vi.api[reaction]}
                </button>
              ))}
              <button
                className="secondary-button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate('save')}
              >
                {query.data?.viewerContext.isBookmarked ? vi.api.unbookmark : vi.api.bookmark}
              </button>
            </div>
          ) : (
            <Link className="primary-button" href={login}>
              {vi.api.loginRequired}
            </Link>
          )}
          <button
            className="secondary-button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate('share')}
          >
            {vi.api.share}
          </button>
          {post.authorId === user?.id && (
            <>
              <PostEditor id={id} title={post.title} body={post.body} />
              {post.status === 'draft' && (
                <button
                  className="primary-button"
                  disabled={mutation.isPending || (!post.body.trim() && post.mediaIds.length === 0)}
                  onClick={() => mutation.mutate('publish')}
                >
                  {vi.api.publish}
                </button>
              )}
              <p>{vi.api.mediaUnavailable}</p>
              <button
                className="secondary-button"
                disabled={mutation.isPending}
                onClick={() => (isDeleting ? mutation.mutate('delete') : setDeleting(true))}
              >
                {isDeleting ? vi.api.confirmDelete : vi.api.remove}
              </button>
            </>
          )}
          <section className="detail-section">
            <LiveComments postId={id} />
          </section>
        </>
      )}
    </main>
  );
}
function PostEditor({
  id,
  title: initialTitle,
  body: initialBody,
}: {
  id: string;
  title: string;
  body: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => socialApi.updatePost(id, { title: title.trim(), body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['social'] }),
  });
  return (
    <details>
      <summary>{vi.api.edit}</summary>
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          {vi.api.title}
          <input required value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          {vi.api.body}
          <textarea aria-label={vi.api.body} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <ApiErrorNotice error={mutation.error} />
        {mutation.isSuccess && <output>{vi.api.saved}</output>}
        <button className="primary-button" disabled={mutation.isPending || !title.trim()}>
          {mutation.isPending ? vi.api.saving : vi.api.save}
        </button>
      </form>
    </details>
  );
}
