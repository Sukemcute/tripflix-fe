import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import type { SocialCommentDto } from './generated/core-api/model/socialCommentDto';
import type { SocialCommentPageDto } from './generated/core-api/model/socialCommentPageDto';

type CommentLike = Pick<SocialCommentDto, 'isLiked' | 'likeCount'>;

function patchCommentLike(
  client: QueryClient,
  queryKey: QueryKey,
  commentId: string,
  patch: (comment: CommentLike) => CommentLike,
) {
  client.setQueryData<InfiniteData<SocialCommentPageDto>>(
    queryKey,
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((comment) =>
            comment.id === commentId ? { ...comment, ...patch(comment) } : comment,
          ),
        })),
      },
  );
}

/** Applies a like straight away and returns how to undo it if the request fails. */
export function updateCommentLikeCache(
  client: QueryClient,
  queryKey: QueryKey,
  commentId: string,
  isLiked: boolean,
) {
  const previous = client
    .getQueryData<InfiniteData<SocialCommentPageDto>>(queryKey)
    ?.pages.flatMap((page) => page.items)
    .find((comment) => comment.id === commentId);
  patchCommentLike(client, queryKey, commentId, (comment) => ({
    isLiked,
    likeCount: Math.max(0, comment.likeCount + Number(isLiked) - Number(comment.isLiked)),
  }));
  return () => {
    if (!previous) return;
    patchCommentLike(client, queryKey, commentId, () => ({
      isLiked: previous.isLiked,
      likeCount: previous.likeCount,
    }));
  };
}
