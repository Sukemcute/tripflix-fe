import type { InfiniteData } from '@tanstack/react-query';
import type { socialApi } from '@tripflix/api-client';

type CommentPage = Awaited<ReturnType<typeof socialApi.listComments>>;
type Comment = CommentPage['items'][number];

export function shouldShowReplyQuote(comment: Pick<Comment, 'parentCommentId' | 'replyToCommentId'>) {
  return Boolean(comment.parentCommentId && comment.replyToCommentId && comment.replyToCommentId !== comment.parentCommentId);
}

export function appendReply(data: InfiniteData<CommentPage> | undefined, reply: Comment) {
  if (!data?.pages.length || data.pages.some((page) => page.items.some((item) => item.id === reply.id))) return data;
  return { ...data, pages: data.pages.map((page, index) => ({
    ...page,
    total: page.total + 1,
    items: index === data.pages.length - 1 ? [...page.items, reply] : page.items,
  })) };
}

/** A submitted reply can also arrive in a later server page. Keep one copy in chronological order. */
export function commentItems(data: InfiniteData<CommentPage> | undefined, isReply: boolean) {
  const items = [...new Map(data?.pages.flatMap((page) => page.items).map((item) => [item.id, item])).values()];
  return isReply ? items.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)) : items;
}
