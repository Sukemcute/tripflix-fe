import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recommendPublicPosts } from './explore-search';
import { configureHttp } from './http';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => configureHttp({ baseUrl: 'http://api' }));
afterEach(() => vi.restoreAllMocks());

const item = (id: string) => ({ post: { id }, source: 'hot', reason: { code: 'trending', text: '' } });
const detail = (id: string) => ({ post: { id, title: `Bài ${id}` }, viewerContext: { myReaction: null, isBookmarked: false }, shareUrl: 'x' });

describe('recommendPublicPosts', () => {
  it('gọi /api/recommendations/posts rồi lấy chi tiết từng bài, giữ thứ tự gợi ý, bỏ bài lỗi', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/recommendations/posts') {
        return json({ items: [item('b'), item('gone'), item('a')], algo: 'for_you', nextCursor: 'c2' });
      }
      return url.pathname.endsWith('/gone') ? json({ message: 'not found' }, 404) : json(detail(url.pathname.split('/').pop()!));
    });
    const page = await recommendPublicPosts('c1', undefined, 'vlog');
    expect(page.items.map((p) => p.id)).toEqual(['b', 'a']);
    expect(page.nextCursor).toBe('c2');
    const url = new URL(String(send.mock.calls[0]![0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({ mode: 'for_you', limit: '7', cursor: 'c1', postType: 'vlog' });
  });
});

describe('recommendedPage (giữ trang gợi ý đã tải khi bị làm mới)', () => {
  it('invalidate [social] sau bình luận: không gọi lại trang đã tải, không trùng bài; trang mới vẫn gọi mạng', async () => {
    const { QueryClient, InfiniteQueryObserver } = await import('@tanstack/react-query');
    const { recommendedPage } = await import('./queries');
    const client = new QueryClient();
    const key = ['social', 'public', 'u1', '', 'vlog', 'recommended'];
    // Server giả: mỗi lần gọi trang 1 ra danh sách khác (gu trong phiên đổi), như khi gọi lại sau bình luận.
    let calls = 0;
    const fetchPage = vi.fn(async (cursor: string | undefined) => {
      calls += 1;
      return cursor ? { items: [{ id: `p2-${calls}` }], nextCursor: null } : { items: [{ id: `p1-${calls}` }], nextCursor: 'c2' };
    });
    const observer = new InfiniteQueryObserver(client, {
      queryKey: key,
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => recommendedPage(client, key, pageParam) ?? fetchPage(pageParam),
      getNextPageParam: (page: { items: Array<{ id: string }>; nextCursor: string | null }) => page.nextCursor ?? undefined,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
    await observer.fetchNextPage();
    expect(fetchPage).toHaveBeenCalledTimes(2);

    await client.invalidateQueries({ queryKey: ['social'] });
    const ids = observer.getCurrentResult().data!.pages.flatMap((p) => p.items.map((i) => i.id));
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(ids).toEqual(['p1-1', 'p2-2']);
    unsubscribe();
  });
});
