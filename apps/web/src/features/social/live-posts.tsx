'use client';
import { useApiSession, useSocialPosts } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';

// Trang chi tiết bài viết nằm ở post-detail.tsx; giữ export ở đây để app/trips/[slug]/page.tsx không phải đổi.
export { LivePostDetail } from './post-detail';

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
