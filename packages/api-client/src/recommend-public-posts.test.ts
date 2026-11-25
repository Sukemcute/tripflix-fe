import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recommendPublicPosts } from './explore-search';
import { withoutRepeatedPosts } from './queries';
import { configureHttp } from './http';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => configureHttp({ baseUrl: 'http://api' }));
afterEach(() => vi.restoreAllMocks());

const item = (id: string) => ({ post: { id }, source: 'hot', reason: { code: 'trending', text: '' } });
/** GET /api/v1/posts?ids=: server trả các bài còn hiện, đúng thứ tự id; 'gone' coi như đã ẩn/xoá. */
const postsByIds = (url: URL, viewerContext: unknown = { myReaction: null, isBookmarked: false }) =>
  json({
    items: url.searchParams.get('ids')!.split(',').filter((id) => id !== 'gone').map((id) => ({ id, title: `Bài ${id}`, viewerContext })),
    nextCursor: null,
    hasMore: false,
  });

describe('recommendPublicPosts', () => {
  it('gọi /api/recommendations/posts rồi lấy cả trang bài trong một lần, giữ thứ tự gợi ý, bỏ bài đã ẩn', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/recommendations/posts') {
        return json({ items: [item('b'), item('gone'), item('a')], algo: 'for_you', nextCursor: 'c2' });
      }
      return postsByIds(url);
    });
    const page = await recommendPublicPosts('c1', undefined, 'vlog');
    expect(page.items.map((p) => p.id)).toEqual(['b', 'a']);
    expect(send).toHaveBeenCalledTimes(2);
    expect(new URL(String(send.mock.calls[1]![0])).searchParams.get('ids')).toBe('b,gone,a');
    expect(page.nextCursor).toBe('c2');
    const url = new URL(String(send.mock.calls[0]![0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({ mode: 'for_you', limit: '7', cursor: 'c1', postType: 'vlog' });
  });

  it('giữ viewerContext của từng bài để F5 vẫn hiện tim đã thả', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/recommendations/posts') {
        return json({ items: [item('liked')], algo: 'for_you', nextCursor: null });
      }
      return postsByIds(url, { myReaction: 'like', isBookmarked: true });
    });
    const page = await recommendPublicPosts();
    expect(page.items[0]?.viewerContext).toEqual({ myReaction: 'like', isBookmarked: true });
  });

  it('gửi fresh=true ở trang đầu khi bật fresh, bỏ qua khi có cursor hoặc không bật fresh', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/recommendations/posts') {
        return json({ items: [item('p1')], algo: 'for_you', nextCursor: 'c2' });
      }
      return postsByIds(url);
    });

    await recommendPublicPosts(undefined, undefined, 'vlog', 'for_you', { fresh: true });
    const firstUrl = new URL(String(send.mock.calls[0]![0]));
    expect(Object.fromEntries(firstUrl.searchParams)).toEqual({ mode: 'for_you', limit: '7', fresh: 'true', postType: 'vlog' });

    await recommendPublicPosts('c1', undefined, 'vlog', 'for_you', { fresh: true });
    const cursorUrl = new URL(String(send.mock.calls[2]![0]));
    expect(Object.fromEntries(cursorUrl.searchParams)).toEqual({ mode: 'for_you', limit: '7', cursor: 'c1', postType: 'vlog' });

    await recommendPublicPosts(undefined, undefined, 'vlog', 'for_you');
    const defaultUrl = new URL(String(send.mock.calls[4]![0]));
    expect(Object.fromEntries(defaultUrl.searchParams)).toEqual({ mode: 'for_you', limit: '7', postType: 'vlog' });
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

describe('withoutRepeatedPosts', () => {
  it('bài cuối trang trước lặp ở đầu trang sau (gợi ý xếp lại mỗi trang): giữ lần đầu, không trùng key', () => {
    const page = (ids: string[], nextCursor: string | null) => ({ items: ids.map((id) => ({ id })), nextCursor });
    const data = { pages: [page(['a', 'b', 'c'], 'c2'), page(['c', 'd', 'e'], 'c3'), page(['e', 'f'], null)], pageParams: [undefined, 'c2', 'c3'] };
    const out = withoutRepeatedPosts(data);
    expect(out.pages.map((p) => p.items.map((x) => x.id))).toEqual([['a', 'b', 'c'], ['d', 'e'], ['f']]);
    expect(out.pageParams).toEqual(data.pageParams);
    expect(out.pages[2]!.nextCursor).toBeNull();
    expect(data.pages[1]!.items).toHaveLength(3); // không sửa cache gốc
  });
});
