import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPublicPosts } from './explore-search';
import { configureHttp } from './http';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => configureHttp({ baseUrl: 'http://api' }));
afterEach(() => vi.restoreAllMocks());

const hit = (refId: string) => ({
  id: `post:${refId}`, kind: 'plan', refId, title: refId, subtitle: null, thumbnail: null, reason: '', priceFrom: null, days: null, location: null,
});
const unliked = { myReaction: null, isBookmarked: false };
/** GET /api/v1/posts?ids=: server trả các bài còn hiện, đúng thứ tự id; 'gone' coi như đã ẩn/xoá. */
const postsByIds = (url: URL, viewerContext: unknown = unliked) =>
  json({
    items: url.searchParams.get('ids')!.split(',').filter((id) => id !== 'gone').map((id) => ({ id, title: `Bài ${id}`, viewerContext })),
    nextCursor: null,
    hasMore: false,
  });

describe('searchPublicPosts', () => {
  it('gọi /api/search/posts rồi lấy cả trang bài trong một lần, giữ nguyên thứ tự xếp hạng và nextCursor', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('b'), hit('a'), hit('c')], total: 3, nextCursor: '3' });
      }
      return postsByIds(url);
    });
    const page = await searchPublicPosts('vin com', '0');
    expect(page.items.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(send).toHaveBeenCalledTimes(2);
    expect(new URL(String(send.mock.calls[1]![0])).searchParams.get('ids')).toBe('b,a,c');
    expect(page.nextCursor).toBe('3');
    const [, init] = send.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({ q: 'vin com', cursor: '0', limit: 10 });
  });

  it('bài đã ẩn/xoá (server không trả) thì không có trong trang, trang vẫn hiện', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('a'), hit('gone')], total: 2, nextCursor: null });
      }
      return postsByIds(url);
    });
    const page = await searchPublicPosts('sunworld');
    expect(page.items.map((p) => p.id)).toEqual(['a']);
    expect(page.nextCursor).toBeNull();
  });

  it('giữ viewerContext của từng bài để kết quả tìm hiện đúng tim đã thả', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('liked')], total: 1, nextCursor: null });
      }
      return postsByIds(url, { myReaction: 'like', isBookmarked: false });
    });
    const page = await searchPublicPosts('đà lạt');
    expect(page.items[0]?.viewerContext).toEqual({ myReaction: 'like', isBookmarked: false });
  });

  it('không có kết quả thì trả trang rỗng, không gọi chi tiết', async () => {
    const send = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ understood: {}, items: [], total: 0, nextCursor: null }));
    expect(await searchPublicPosts('xyz')).toEqual({ items: [], nextCursor: null });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
