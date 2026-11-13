'use client';
import { evictPostFromCache, isPostNotFoundError, socialApi, useApiSession, useFollowAuthor } from '@tripflix/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getInitial } from '@/features/auth/account-helpers';
import { LiveComments } from './live-comments';
import { getPostCover, POST_COVER_MASCOT } from './post-cover';

type Reaction = 'like' | 'love' | 'helpful';
type PostAction = Reaction | 'save' | 'delete' | 'share' | 'publish';
const REACTIONS: readonly Reaction[] = ['like', 'love', 'helpful'];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

/** Trang chi tiết bài viết: cột chính (bài, nút tương tác, bình luận) và cột phụ (chuyến đi gắn kèm, tương tác). */
export function LivePostDetail({ id, focusCommentId }: { id: string; focusCommentId?: string }) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['social', 'post', id, user?.id],
    enabled: isReady && !!id,
    queryFn: ({ signal }) => socialApi.getPost(id, signal),
  });

  const isNotFound = isPostNotFoundError(query.error);

  useEffect(() => {
    if (isNotFound) {
      evictPostFromCache(client, id);
    }
  }, [isNotFound, id, client]);

  const [isDeleting, setDeleting] = useState(false);
  const [isShareCopied, setShareCopied] = useState(false);
  const mutation = useMutation({
    mutationFn: async (action: PostAction) => {
      if (action === 'save') return socialApi.setBookmark(id, !query.data?.viewerContext.isBookmarked);
      if (action === 'delete') return socialApi.deletePost(id);
      if (action === 'publish') return socialApi.publishPost(id);
      if (action === 'share') {
        const url = window.location.href;
        if (navigator.share) await navigator.share({ title: query.data?.post.title, url });
        else {
          await navigator.clipboard.writeText(url);
          setShareCopied(true);
        }
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
  const viewer = query.data?.viewerContext;
  const login = `/login?returnTo=${encodeURIComponent(`/trips/${id}`)}`;
  const trip = post?.tripAttachment;
  const isAuthor = !!post && post.authorId === user?.id;
  const canShowFollow = isReady && !!post && post.status === 'published' && !isAuthor;
  const follow = useFollowAuthor(canShowFollow ? post.authorId : undefined);
  const authorName = isAuthor
    ? (user?.displayName ?? vi.api.postYou)
    : post?.authorName?.trim() || vi.api.postAuthorFallback;
  const cover = getPostCover(trip?.destinationName);

  if (isNotFound) {
    return (
      <main id="content" className="ota-container post-page">
        <Link prefetch={false} className="post-back" href="/">
          {vi.api.back}
        </Link>
        <section className="post-unavailable-card" role="alert">
          <div className="post-unavailable-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>{vi.api.postUnavailable}</h2>
          <p>{vi.api.postUnavailableHint}</p>
          <div className="post-unavailable-actions">
            <Link prefetch={false} className="primary-button" href="/">
              {vi.api.backHome}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="content" className="ota-container post-page">
      <Link prefetch={false} className="post-back" href="/">
        {vi.api.back}
      </Link>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {(!isReady || query.isPending) && <output className="post-loading">{vi.api.loading}</output>}
      {post && (
        <div className="post-layout">
          <div className="post-main">
            <header className="post-header">
              <p className="post-kicker">
                {trip?.destinationName && <span>{trip.destinationName}</span>}
                {post.status === 'draft' ? (
                  <span className="post-draft">{vi.api.draft}</span>
                ) : (
                  <span>
                    {t('api.postPublishedOn', { date: formatDate(post.publishedAt ?? post.createdAt) })}
                  </span>
                )}
              </p>
              <h1>{post.title}</h1>
              <div className="post-byline">
                <span className="post-avatar" aria-hidden="true">
                  {getInitial(authorName)}
                </span>
                <span>{authorName}</span>
                {canShowFollow && (user ? (
                  <button type="button" className="secondary-button" onClick={follow.toggle} disabled={!follow.canToggle}>
                    {follow.isLoading || follow.isUpdating ? vi.api.loading
                      : follow.isFollowing ? vi.api.unfollowAuthor : vi.api.followAuthor}
                  </button>
                ) : (
                  <Link className="secondary-button" href={login}>{vi.api.followAuthor}</Link>
                ))}
                {post.hashtags.length > 0 && (
                  <ul className="post-tags" aria-label={vi.api.hashtags}>
                    {post.hashtags.map((tag) => (
                      <li key={tag}>#{tag}</li>
                    ))}
                  </ul>
                )}
              </div>
              {canShowFollow && <ApiErrorNotice error={follow.error} retry={() => void follow.retry()} />}
            </header>

            {post.mediaIds.length > 0 && (
              <figure className={cover ? 'post-cover' : 'post-cover is-brand'}>
                {cover ? (
                  <Image src={cover} alt="" fill sizes="(max-width: 900px) 100vw, 60vw" />
                ) : (
                  <Image
                    className="post-cover-mascot"
                    src={POST_COVER_MASCOT}
                    alt=""
                    width={140}
                    height={140}
                  />
                )}
                <figcaption>
                  <span className="post-cover-badge">{vi.api.postVideoBadge}</span>
                  {vi.api.postWatchOnApp}
                </figcaption>
              </figure>
            )}

            <p className="post-body">{post.body}</p>

            {!!trip?.items?.length && (
              <section className="post-itinerary" aria-labelledby="post-itinerary-title">
                <h2 id="post-itinerary-title">{vi.api.postItinerary}</h2>
                <ol>
                  {trip.items.map((item, index) => (
                    <li key={index}>
                      <span className="post-itinerary-day">{t('api.postDay', { day: item.day })}</span>
                      <div>
                        <strong>{item.title}</strong>
                        {item.location && <p>{item.location}</p>}
                        {item.notes && <p>{item.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <ApiErrorNotice error={mutation.error} />
            <div className="post-actions">
              <div className="post-reactions">
                {REACTIONS.map((reaction) => {
                  // Tên nút đúng bằng nhãn ("Thích") để test e2e và trình đọc màn hình tìm được; số đếm gắn bằng aria-describedby.
                  const countId = `post-count-${reaction}`;
                  const label = (
                    <>
                      {vi.api[reaction]}
                      <span className="post-count" id={countId}>
                        {post.reactionCounts[reaction] ?? 0}
                      </span>
                    </>
                  );
                  return user ? (
                    <button
                      key={reaction}
                      type="button"
                      className="post-chip"
                      aria-label={vi.api[reaction]}
                      aria-describedby={countId}
                      aria-pressed={viewer?.myReaction === reaction}
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate(reaction)}
                    >
                      {label}
                    </button>
                  ) : (
                    <Link
                      prefetch={false}
                      key={reaction}
                      className="post-chip"
                      href={login}
                      aria-label={vi.api[reaction]}
                      aria-describedby={countId}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
              <div className="post-reactions">
                {user ? (
                  <button
                    type="button"
                    className="post-chip"
                    aria-pressed={!!viewer?.isBookmarked}
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate('save')}
                  >
                    {viewer?.isBookmarked ? vi.api.unbookmark : vi.api.bookmark}
                  </button>
                ) : (
                  <Link prefetch={false} className="post-chip" href={login}>
                    {vi.api.bookmark}
                  </Link>
                )}
                <button
                  type="button"
                  className="post-chip"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate('share')}
                >
                  {vi.api.share}
                </button>
              </div>
            </div>
            {isShareCopied && <output className="post-note">{vi.api.postShareCopied}</output>}
          </div>

          <aside className="post-aside">
            {trip && (trip.hotelName || trip.destinationName) && (
              <section className="post-card">
                <p className="post-card-label">{vi.api.postTripTitle}</p>
                {trip.hotelName && <strong className="post-hotel">{trip.hotelName}</strong>}
                <ul className="post-facts">
                  {trip.destinationName && <li>{trip.destinationName}</li>}
                  {!!trip.daysCount && <li>{t('api.postDays', { count: trip.daysCount })}</li>}
                  {!!trip.estimatedCostPerPerson && (
                    <li>
                      {t('api.postCostPerPerson', {
                        cost: trip.estimatedCostPerPerson.toLocaleString('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }),
                      })}
                    </li>
                  )}
                </ul>
                {trip.hotelName && (
                  <Link
                    prefetch={false}
                    className="primary-button post-card-cta"
                    href={`/search?q=${encodeURIComponent(trip.hotelName)}`}
                  >
                    {vi.api.postFindRoom}
                  </Link>
                )}
                {trip.priceDisclaimer && <p className="post-card-note">{trip.priceDisclaimer}</p>}
              </section>
            )}
            <section className="post-card">
              <p className="post-card-label">{vi.api.postStats}</p>
              <ul className="post-stats">
                <li>{t('api.postReactionsTotal', { count: post.reactionTotal })}</li>
                <li>{t('api.postSaves', { count: post.bookmarkCount })}</li>
                <li>{t('api.postShares', { count: post.shareCount })}</li>
              </ul>
            </section>
            {isAuthor && (
              <section className="post-card">
                <p className="post-card-label">{vi.api.postManage}</p>
                <p className="post-card-note">{vi.api.postManageHint}</p>
                <PostEditor id={id} title={post.title} body={post.body} />
                <div className="post-manage-actions">
                  {post.status === 'draft' && (
                    <button
                      type="button"
                      className="primary-button"
                      disabled={mutation.isPending || (!post.body.trim() && post.mediaIds.length === 0)}
                      onClick={() => mutation.mutate('publish')}
                    >
                      {vi.api.publish}
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={mutation.isPending}
                    onClick={() => (isDeleting ? mutation.mutate('delete') : setDeleting(true))}
                  >
                    {isDeleting ? vi.api.confirmDelete : vi.api.remove}
                  </button>
                  {isDeleting && (
                    <button type="button" className="secondary-button" onClick={() => setDeleting(false)}>
                      {vi.api.cancel}
                    </button>
                  )}
                </div>
                <p className="post-card-note">{vi.api.mediaUnavailable}</p>
              </section>
            )}
          </aside>
          <section className="post-comments" aria-labelledby="post-comments-title">
            <h2 id="post-comments-title">{t('api.commentsWithCount', { count: post.commentCount })}</h2>
            <LiveComments key={focusCommentId} postId={id} focusCommentId={focusCommentId} />
          </section>
        </div>
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
    <details className="post-editor">
      <summary>{vi.api.edit}</summary>
      <form
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
          <textarea value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <ApiErrorNotice error={mutation.error} />
        {mutation.isSuccess && <output className="post-note">{vi.api.saved}</output>}
        <button className="primary-button" disabled={mutation.isPending || !title.trim()}>
          {mutation.isPending ? vi.api.saving : vi.api.save}
        </button>
      </form>
    </details>
  );
}
