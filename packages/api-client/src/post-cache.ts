import type { QueryClient } from '@tanstack/react-query';
import { HttpError } from './http';

interface CacheItemLike {
  id?: string;
  postId?: string;
}

/**
 * Kiểm tra xem một lỗi trả về từ API có phải là lỗi 404 Not Found hay không.
 * Xảy ra khi bài viết bị xoá, tạm ẩn do kiểm duyệt hoặc ID không tồn tại.
 */
export function isPostNotFoundError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof HttpError) return error.status === 404;
  return (error as { status?: number }).status === 404;
}

/**
 * Dọn sạch bài viết khỏi cache của TanStack Query:
 * 1. Xoá query chi tiết bài viết, bình luận, và tóm tắt AI.
 * 2. Lọc bỏ bài viết khỏi tất cả các danh sách/feed đang lưu trong cache (cả feed reels và danh sách social).
 */
export function evictPostFromCache(client: QueryClient, postId: string): void {
  if (!postId) return;

  // 1. Xoá các truy vấn chi tiết và liên quan đến bài viết
  client.removeQueries({ queryKey: ['social', 'post', postId] });
  client.removeQueries({ queryKey: ['social', 'comments', postId] });
  client.removeQueries({ queryKey: ['social', 'summary', postId] });
  client.removeQueries({ queryKey: ['social', 'summary-evidence', postId] });

  // 2. Lọc bỏ bài viết khỏi cache bảng tin reels (feed/for_you)
  client.setQueriesData({ queryKey: ['feed'] }, (oldData: unknown) => {
    if (!oldData || typeof oldData !== 'object') return oldData;
    const data = oldData as Record<string, unknown>;
    if (Array.isArray(data.pages)) {
      return {
        ...data,
        pages: data.pages.map((page: unknown) => {
          if (!page || typeof page !== 'object') return page;
          const pageObj = page as Record<string, unknown>;
          if (Array.isArray(pageObj.items)) {
            return {
              ...pageObj,
              items: (pageObj.items as CacheItemLike[]).filter((item) => item?.postId !== postId),
            };
          }
          return page;
        }),
      };
    }
    return oldData;
  });

  // 3. Lọc bỏ bài viết khỏi cache danh sách bài viết social (public, mine, bookmarks,...)
  client.setQueriesData({ queryKey: ['social'] }, (oldData: unknown) => {
    if (!oldData || typeof oldData !== 'object') return oldData;
    const data = oldData as Record<string, unknown>;
    if (Array.isArray(data.pages)) {
      return {
        ...data,
        pages: data.pages.map((page: unknown) => {
          if (!page || typeof page !== 'object') return page;
          const pageObj = page as Record<string, unknown>;
          if (Array.isArray(pageObj.items)) {
            return {
              ...pageObj,
              items: (pageObj.items as CacheItemLike[]).filter(
                (item) => item?.id !== postId && item?.postId !== postId,
              ),
            };
          }
          if (Array.isArray(pageObj.posts)) {
            return {
              ...pageObj,
              posts: (pageObj.posts as CacheItemLike[]).filter((item) => item?.id !== postId),
            };
          }
          return page;
        }),
      };
    }
    if (Array.isArray(data.items)) {
      return {
        ...data,
        items: (data.items as CacheItemLike[]).filter(
          (item) => item?.id !== postId && item?.postId !== postId,
        ),
      };
    }
    return oldData;
  });
}
