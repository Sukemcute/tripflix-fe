import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import { socialApi } from '@tripflix/api-client';
import type {
  FeedPageDto,
  SocialCommentDto,
  SocialCommentPageDto,
  SocialPostDetailDto,
} from '@tripflix/api-client/core-api/model/index';

/**
 * Cập nhật bình luận thẳng vào cache React Query sau khi server xác nhận, thay vì tải lại mọi trang.
 * Danh sách bình luận nằm ở ['social', 'comments', postId, parentCommentId?, userId?] (mới nhất lên đầu, như BE);
 * chuỗi bình luận đang xem nằm ở ['social', 'comment-thread', postId, ...].
 */
type CommentPages = InfiniteData<SocialCommentPageDto>;
type CommentUpdate = (comment: SocialCommentDto) => SocialCommentDto | null;

/** Tín hiệu chỉ mang postId: đọc lại bình luận và số đếm chuẩn của bài từ server. */
export async function reloadPostComments(client: QueryClient, postId: string): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['social', 'comments', postId] }),
    client.invalidateQueries({ queryKey: ['social', 'comment-thread', postId] }),
    socialApi.getPost(postId).then((detail) => {
      client.setQueriesData<SocialPostDetailDto>({ queryKey: ['social', 'post', postId] }, detail);
      client.setQueriesData<InfiniteData<{ items: SocialPostDetailDto['post'][] }>>(
        { queryKey: ['social'], predicate: (query) => !['comments', 'post', 'comment-thread'].includes(String(query.queryKey[1])) },
        (data) => hasPages(data) ? ({ ...data, pages: data.pages.map((page) => ({ ...page,
          items: page.items?.map((post) => post.id === postId ? { ...post, commentCount: detail.post.commentCount } : post),
        })) }) : data,
      );
      client.setQueriesData<InfiniteData<FeedPageDto>>({ queryKey: ['feed'] }, (data) => data && ({
        ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((post) =>
          post.postId === postId ? { ...post, counts: { ...post.counts, comments: detail.post.commentCount } } : post),
        })),
      }));
    }).catch(() => { void client.invalidateQueries({ queryKey: ['social', 'post', postId] }); }),
  ]);
}

function commentListsKey(postId: string): QueryKey {
  return ['social', 'comments', postId];
}

function hasPages<T>(data: InfiniteData<T> | undefined): data is InfiniteData<T> {
  return Array.isArray(data?.pages);
}

/** Áp `update` lên từng bình luận của một trang; trả null là bỏ khỏi trang. Không đổi gì thì giữ nguyên tham chiếu. */
function updatePage(page: SocialCommentPageDto, update: CommentUpdate): SocialCommentPageDto {
  let removedCount = 0;
  let isChanged = false;
  const items: SocialCommentDto[] = [];
  for (const comment of page.items) {
    const next = update(comment);
    if (next !== comment) isChanged = true;
    if (next) items.push(next);
    else removedCount += 1;
  }
  if (!isChanged) return page;
  return { ...page, items, total: Math.max(0, page.total - removedCount) };
}

function updateCommentPages(data: CommentPages, update: CommentUpdate): CommentPages {
  const pages = data.pages.map((page) => updatePage(page, update));
  if (pages.every((page, index) => page === data.pages[index])) return data;
  // `total` là tổng của cả danh sách, trang nào cũng mang: bớt bao nhiêu thì mọi trang cùng bớt.
  const removedCount = pages.reduce(
    (sum, page, index) => sum + data.pages[index]!.items.length - page.items.length,
    0,
  );
  return {
    ...data,
    pages: pages.map((page, index) => ({
      ...page,
      total: Math.max(0, data.pages[index]!.total - removedCount),
    })),
  };
}

/** Sửa mọi danh sách và chuỗi bình luận đang cache của bài. */
function updateCachedComments(client: QueryClient, postId: string, update: CommentUpdate) {
  for (const [queryKey, data] of client.getQueriesData<CommentPages>({ queryKey: commentListsKey(postId) })) {
    if (hasPages(data)) client.setQueryData<CommentPages>(queryKey, updateCommentPages(data, update));
  }
  for (const [queryKey, data] of client.getQueriesData<SocialCommentPageDto>({
    queryKey: ['social', 'comment-thread', postId],
  })) {
    if (Array.isArray(data?.items)) client.setQueryData(queryKey, updatePage(data, update));
  }
}

function findCachedComment(client: QueryClient, postId: string, commentId: string) {
  for (const [, data] of client.getQueriesData<CommentPages>({ queryKey: commentListsKey(postId) })) {
    if (!hasPages(data)) continue;
    const comment = data.pages.flatMap((page) => page.items).find((entry) => entry.id === commentId);
    if (comment) return comment;
  }
  for (const [, data] of client.getQueriesData<SocialCommentPageDto>({
    queryKey: ['social', 'comment-thread', postId],
  })) {
    const comment = data?.items?.find((entry) => entry.id === commentId);
    if (comment) return comment;
  }
  return undefined;
}

/** BE chỉ đếm bình luận đang hiện vào `commentCount` của bài; bình luận bị giữ chờ duyệt thì không. */
function isCountedComment(comment: Pick<SocialCommentDto, 'status'>): boolean {
  return comment.status === undefined || comment.status === 'visible';
}

/** Đổi số bình luận của bài ở chi tiết bài, danh sách bài (social) và thẻ Reels (feed). */
function shiftPostCommentCount(client: QueryClient, postId: string, delta: number) {
  if (delta === 0) return;
  const shift = (count: number) => Math.max(0, count + delta);

  client.setQueriesData<SocialPostDetailDto>({ queryKey: ['social', 'post', postId] }, (data) =>
    data?.post ? { ...data, post: { ...data.post, commentCount: shift(data.post.commentCount) } } : data,
  );

  // Danh sách bài (feed cộng đồng, bài của tôi, đã lưu...): chỉ đụng đúng bài có `commentCount`.
  client.setQueriesData<InfiniteData<{ items: unknown[] }>>(
    {
      queryKey: ['social'],
      predicate: (query) => query.queryKey[1] !== 'comments' && query.queryKey[1] !== 'post',
    },
    (data) => {
      if (!hasPages(data)) return data;
      let isChanged = false;
      const pages = data.pages.map((page) => {
        if (!Array.isArray(page?.items)) return page;
        const items = page.items.map((item) => {
          const post = item as { id?: unknown; commentCount?: unknown };
          if (post.id !== postId || typeof post.commentCount !== 'number') return item;
          isChanged = true;
          return { ...post, commentCount: shift(post.commentCount) };
        });
        return { ...page, items };
      });
      return isChanged ? { ...data, pages } : data;
    },
  );

  client.setQueriesData<InfiniteData<FeedPageDto>>({ queryKey: ['feed'] }, (data) => {
    if (!hasPages(data)) return data;
    let isChanged = false;
    const pages = data.pages.map((page) => {
      if (!Array.isArray(page?.items)) return page;
      const items = page.items.map((card) => {
        if (card.postId !== postId || typeof card.counts?.comments !== 'number') return card;
        isChanged = true;
        return { ...card, counts: { ...card.counts, comments: shift(card.counts.comments) } };
      });
      return { ...page, items };
    });
    return isChanged ? { ...data, pages } : data;
  });
}

/** Bản tóm tắt do AI tạo lại sau, không đổi ngay: chỉ đánh dấu cũ để lần mở sau tải lại. */
function markSummaryStale(client: QueryClient, postId: string) {
  void client.invalidateQueries({ queryKey: ['social', 'summary', postId], refetchType: 'none' });
}

/** Bình luận vừa gửi: chèn lên đầu đúng danh sách (gốc hoặc trả lời), cộng số trả lời của bình luận gốc và số bình luận của bài. */
export function addCommentToCache(client: QueryClient, comment: SocialCommentDto) {
  const parentCommentId = comment.parentCommentId ?? undefined;
  // Bình luận mới chưa có trả lời; BE không trả replyCount khi vừa tạo.
  const added: SocialCommentDto = { replyCount: 0, ...comment };

  for (const [queryKey, data] of client.getQueriesData<CommentPages>({
    queryKey: commentListsKey(comment.postId),
  })) {
    if (!hasPages(data) || data.pages.length === 0) continue;
    const listParentId = (queryKey[3] as string | null | undefined) ?? undefined;

    if (listParentId === parentCommentId) {
      if (data.pages.some((page) => page.items.some((entry) => entry.id === comment.id))) continue;
      const [firstPage, ...otherPages] = data.pages;
      client.setQueryData<CommentPages>(queryKey, {
        ...data,
        pages: [
          { ...firstPage!, items: [added, ...firstPage!.items], total: firstPage!.total + 1 },
          ...otherPages.map((page) => ({ ...page, total: page.total + 1 })),
        ],
      });
    } else if (parentCommentId) {
      client.setQueryData<CommentPages>(
        queryKey,
        updateCommentPages(data, (entry) =>
          entry.id === parentCommentId ? { ...entry, replyCount: (entry.replyCount ?? 0) + 1 } : entry,
        ),
      );
    }
  }

  if (isCountedComment(comment)) shiftPostCommentCount(client, comment.postId, 1);
  markSummaryStale(client, comment.postId);
}

/**
 * Bình luận vừa sửa: thay đúng dòng đó, giữ số trả lời (BE không trả replyCount khi sửa).
 * Sửa xong mà bị giữ chờ duyệt thì BE giữ luôn các trả lời và trừ số bình luận: khi đó tải lại bài này cho đúng.
 */
export function replaceCommentInCache(client: QueryClient, comment: SocialCommentDto) {
  const previous = findCachedComment(client, comment.postId, comment.id);
  if (previous && isCountedComment(previous) && !isCountedComment(comment)) {
    void client.invalidateQueries({ queryKey: commentListsKey(comment.postId) });
    void client.invalidateQueries({ queryKey: ['social', 'comment-thread', comment.postId] });
    void client.invalidateQueries({ queryKey: ['social', 'post', comment.postId] });
    void client.invalidateQueries({ queryKey: ['social'], refetchType: 'none' });
    void client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' });
    markSummaryStale(client, comment.postId);
    return;
  }

  updateCachedComments(client, comment.postId, (entry) =>
    entry.id === comment.id ? { ...entry, ...comment, replyCount: comment.replyCount ?? entry.replyCount } : entry,
  );
  markSummaryStale(client, comment.postId);
}

/**
 * Bình luận vừa xoá: bỏ khỏi mọi danh sách. Xoá bình luận gốc thì BE xoá luôn các trả lời,
 * nên số bình luận của bài giảm thêm đúng số trả lời đang hiện của nó.
 */
export function removeCommentFromCache(client: QueryClient, postId: string, commentId: string) {
  const removed = findCachedComment(client, postId, commentId);

  updateCachedComments(client, postId, (entry) => {
    if (entry.id === commentId) return null;
    if (removed?.parentCommentId && entry.id === removed.parentCommentId)
      return { ...entry, replyCount: Math.max(0, (entry.replyCount ?? 0) - 1) };
    return entry;
  });
  client.removeQueries({ queryKey: [...commentListsKey(postId), commentId] });

  if (!removed) {
    // Không có trong cache thì không biết đã xoá bao nhiêu: tải lại số của bài.
    void client.invalidateQueries({ queryKey: ['social', 'post', postId] });
    void client.invalidateQueries({ queryKey: ['social'], refetchType: 'none' });
    void client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' });
  } else {
    const removedReplyCount = removed.parentCommentId ? 0 : (removed.replyCount ?? 0);
    shiftPostCommentCount(client, postId, -(Number(isCountedComment(removed)) + removedReplyCount));
  }
  markSummaryStale(client, postId);
}

/** Thả tim bình luận: ghi đúng số và trạng thái server trả về, không tải lại trang nào. */
export function setCommentReactionInCache(
  client: QueryClient,
  postId: string,
  reaction: Pick<SocialCommentDto, 'isLiked' | 'likeCount'> & { commentId: string },
) {
  updateCachedComments(client, postId, (entry) =>
    entry.id === reaction.commentId
      ? { ...entry, isLiked: reaction.isLiked, likeCount: reaction.likeCount }
      : entry,
  );
}

/**
 * Mở lại panel bình luận: dữ liệu còn mới thì dùng luôn; đã cũ thì chỉ giữ trang đầu rồi tải lại,
 * để không phải tải lại mọi trang đã cuộn trước đó.
 */
export function refreshCommentsIfStale(client: QueryClient, postId: string) {
  const staleTime = client.getDefaultOptions().queries?.staleTime;
  const staleTimeMs = typeof staleTime === 'number' ? staleTime : 0;

  for (const query of client.getQueryCache().findAll({ queryKey: commentListsKey(postId) })) {
    if (!query.isStaleByTime(staleTimeMs)) continue;
    const data = query.state.data as CommentPages | undefined;
    if (hasPages(data) && data.pages.length > 1) {
      client.setQueryData<CommentPages>(query.queryKey, {
        pages: data.pages.slice(0, 1),
        pageParams: data.pageParams.slice(0, 1),
      });
    }
    void client.invalidateQueries({ queryKey: query.queryKey, exact: true });
  }
}
