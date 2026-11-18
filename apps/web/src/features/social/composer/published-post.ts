import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';

type PostPage = { items: SocialPostDto[] };

/**
 * Bài viết vừa đăng: chèn lên đầu trang 1 của feed bài viết (gợi ý, mới nhất) và "Bài đăng của tôi".
 * Feed gợi ý cố ý không tải lại trang đã có khi bị làm mới (recommendedPage trong api-client), nên phải chèn tay
 * thì người đăng mới thấy bài ngay, không phải F5. Danh sách tìm kiếm (có từ khoá), bài đã lưu thì không chèn.
 * Key của useSocialPosts: ['social', kind, userId, keyword, postType, publicSource].
 */
export function addPublishedPostToFeeds(client: QueryClient, post: SocialPostDto): void {
  if (post.postType !== 'vlog' || post.status !== 'published') return;
  client.setQueriesData<InfiniteData<PostPage>>(
    {
      queryKey: ['social'],
      predicate: (query) => {
        const [, kind, , keyword, postType] = query.queryKey;
        return (kind === 'public' || kind === 'mine') && !keyword && (postType === undefined || postType === 'vlog');
      },
    },
    (data) => {
      const firstPage = data?.pages[0];
      if (!data || !firstPage || data.pages.some((page) => page.items.some((item) => item.id === post.id))) return data;
      return { ...data, pages: [{ ...firstPage, items: [post, ...firstPage.items] }, ...data.pages.slice(1)] };
    },
  );
}

type PublishNotice = { id: number; postId: string; postType: 'vlog' | 'video'; status: 'published' | 'held' } | null;

let notice: PublishNotice = null;
const listeners = new Set<() => void>();

/** Thông báo "đã đăng" sống ngoài pop-up đăng bài: pop-up đóng ngay sau khi đăng, thông báo vẫn hiện. */
export const publishNoticeStore = {
  show(postId: string, postType: 'vlog' | 'video', status: 'published' | 'held' = 'published') {
    notice = { id: Date.now(), postId, postType, status };
    listeners.forEach((listener) => listener());
  },
  hide() {
    notice = null;
    listeners.forEach((listener) => listener());
  },
  get: () => notice,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
