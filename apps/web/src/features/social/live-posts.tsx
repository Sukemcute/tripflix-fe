'use client';
import { useApiSession, useSocialPosts } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getPostCover, POST_COVER_MASCOT } from './post-cover';
import styles from './live-posts.module.css';

// Trang chi tiết bài viết nằm ở post-detail.tsx; giữ export ở đây để app/trips/[slug]/page.tsx không phải đổi.
export { LivePostDetail } from './post-detail';

export function PublicPosts({
  kind = 'public',
  keyword = '',
}: {
  kind?: 'public' | 'mine' | 'bookmarks';
  /** Chỉ với bài công khai: tìm theo tiêu đề và nội dung (GET /v1/posts?keyword=). */
  keyword?: string;
}) {
  const { isReady, user } = useApiSession();
  const query = useSocialPosts(kind, keyword);
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
        <p className="empty-state">
          {kind === 'bookmarks'
            ? vi.api.noBookmarks
            : keyword
              ? t('api.noPostsForKeyword', { query: keyword })
              : vi.api.noPosts}
        </p>
      )}
      <div className="trip-grid">
        {posts?.map((post) => {
          const cover = getPostCover(post.tripAttachment?.destinationName);
          const hasCover = kind === 'public';
          return (
            <article key={post.id} className="trip-card">
              <div className={hasCover ? `trip-card-body ${styles.withCover}` : 'trip-card-body'}>
                {hasCover && (
                  <div className={cover ? styles.cover : `${styles.cover} ${styles.mascotCover}`}>
                    {cover ? (
                      <Image
                        src={cover}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                      />
                    ) : (
                      <Image src={POST_COVER_MASCOT} alt="" width={140} height={140} />
                    )}
                  </div>
                )}
                <p className="pin-tag">{post.tripAttachment?.destinationName ?? vi.api.posts}</p>
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
          );
        })}
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
