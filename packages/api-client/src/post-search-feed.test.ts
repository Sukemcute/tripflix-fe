import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPostFeedPage } from './post-search-feed';
import { configureHttp } from './http';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => configureHttp({ baseUrl: 'http://api' }));
afterEach(() => vi.restoreAllMocks());

const hit = (refId: string, thumbnail: string | null = null) => ({
  id: `post:${refId}`, kind: 'video', refId, title: refId, subtitle: null, thumbnail, reason: '', priceFrom: null, days: null, location: null,
});
const detail = (id: string) => ({
  post: { id, title: `Bài ${id}`, postType: id.startsWith('v') ? 'video' : 'vlog' },
  viewerContext: { myReaction: 'like', isBookmarked: true },
  shareUrl: 'x',
});

describe('searchPostFeedPage', () => {
  it('giữ thứ tự xếp hạng, gắn viewerContext vào bài và trả ảnh bìa theo id', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('v1', '/p/v1.jpg'), hit('a2')], total: 2, nextCursor: '12' });
      }
      return json(detail(url.pathname.split('/').pop()!));
    });
    const page = await searchPostFeedPage('đà lạt', { cursor: '0' });
    expect(page.items.map((post) => post.id)).toEqual(['v1', 'a2']);
    expect(page.items[0]?.viewerContext).toEqual({ myReaction: 'like', isBookmarked: true });
    expect(page.thumbnails).toEqual({ v1: '/p/v1.jpg', a2: null });
    expect(page.nextCursor).toBe('12');
    const [, init] = send.mock.calls[0]!;
    // Không gửi postType: grid gộp cả Reels lẫn bài viết.
    expect(JSON.parse(String(init?.body))).toEqual({ q: 'đà lạt', cursor: '0', limit: 12 });
  });

  it('bỏ bài mà chi tiết lỗi (đã ẩn/xoá), không để lại ảnh bìa của bài đó', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/search/posts') {
        return json({ understood: {}, items: [hit('a1'), hit('gone', '/p/gone.jpg')], total: 2, nextCursor: null });
      }
      return url.pathname.endsWith('/gone') ? json({ message: 'not found' }, 404) : json(detail('a1'));
    });
    const page = await searchPostFeedPage('sunworld');
    expect(page.items.map((post) => post.id)).toEqual(['a1']);
    expect(page.thumbnails).toEqual({ a1: null });
    expect(page.nextCursor).toBeNull();
  });

  it('tab Reels gửi postType video', async () => {
    const send = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ understood: {}, items: [], total: 0, nextCursor: null }));
    await searchPostFeedPage('sapa', { postType: 'video' });
    const [, init] = send.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({ q: 'sapa', limit: 12, postType: 'video' });
  });
});
