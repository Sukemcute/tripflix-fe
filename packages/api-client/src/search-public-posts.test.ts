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
const detail = (id: string) => ({ post: { id, title: `Bài ${id}` }, viewerContext: { myReaction: null, isBookmarked: false }, shareUrl: 'x' });

describe('searchPublicPosts', () => {
  it('gọi /api/search/posts rồi lấy chi tiết từng bài, giữ nguyên thứ tự xếp hạng và nextCursor', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('b'), hit('a'), hit('c')], total: 3, nextCursor: '3' });
      }
      return json(detail(url.pathname.split('/').pop()!));
    });
    const page = await searchPublicPosts('vin com', '0');
    expect(page.items.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(page.nextCursor).toBe('3');
    const [, init] = send.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({ q: 'vin com', cursor: '0', limit: 10 });
  });

  it('bỏ qua bài mà chi tiết lỗi (đã ẩn/xoá) thay vì làm hỏng cả trang', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('a'), hit('gone')], total: 2, nextCursor: null });
      }
      return url.pathname.endsWith('/gone') ? json({ message: 'not found' }, 404) : json(detail('a'));
    });
    const page = await searchPublicPosts('sunworld');
    expect(page.items.map((p) => p.id)).toEqual(['a']);
    expect(page.nextCursor).toBeNull();
  });

  it('không có kết quả thì trả trang rỗng, không gọi chi tiết', async () => {
    const send = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ understood: {}, items: [], total: 0, nextCursor: null }));
    expect(await searchPublicPosts('xyz')).toEqual({ items: [], nextCursor: null });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
