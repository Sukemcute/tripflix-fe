import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { seoApi } from './seo';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const options = { baseUrl: 'http://core-api.internal' };

beforeEach(() =>
  configureHttp({ baseUrl: 'https://browser-gateway.example', getAccessToken: () => 'user-access-token' }),
);
afterEach(() => vi.restoreAllMocks());

describe('seoApi', () => {
  it('reads a hotel from its own base URL without the user token', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ id: 'h1', slug: 'vinpearl nha trang', name: 'Vinpearl' }));
    const hotel = await seoApi.getHotel('vinpearl nha trang', options);
    expect(hotel.name).toBe('Vinpearl');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('http://core-api.internal/api/hotels/vinpearl%20nha%20trang');
    expect(new Headers(init?.headers).get('authorization')).toBeNull();
  });

  it('returns the post inside the detail envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ post: { id: 'p1', title: 'Đà Lạt 3 ngày' } }));
    expect((await seoApi.getPost('p1', options)).title).toBe('Đà Lạt 3 ngày');
  });

  it('does not try to refresh a session when the API answers 401', async () => {
    const refresh = vi.fn(async () => true);
    configureHttp({ baseUrl: 'https://browser-gateway.example', refreshAccessToken: refresh });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ message: 'no' }, 401));
    await expect(seoApi.getProfile('u1', options)).rejects.toThrow('HTTP 401');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('pages public posts 50 at a time with the cursor', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ items: [], nextCursor: null, hasMore: false }));
    await seoApi.listPosts('c2', options);
    expect(fetch.mock.calls[0]![0]).toBe('http://core-api.internal/api/v1/posts?limit=50&cursor=c2');
  });

  describe('hasPublicContent', () => {
    const emptyPage = { items: [], nextCursor: null, hasMore: false };
    const publicPost = { id: 'p1', visibility: 'public', status: 'published', deletedAt: null };

    it('trả true khi tác giả có bài công khai và không hỏi bảng tin Reels', async () => {
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(json({ ...emptyPage, items: [publicPost] }));
      expect(await seoApi.hasPublicContent('u1', options)).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0]![0]).toBe('http://core-api.internal/api/v1/posts?author_id=u1&limit=1');
    });

    it('trả true khi tác giả chỉ có Reels công khai (bài trống, bảng tin Reels có mục)', async () => {
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(json(emptyPage))
        .mockResolvedValueOnce(json({ items: [{ id: 'r1' }], nextCursor: 'c', hasMore: true }));
      expect(await seoApi.hasPublicContent('u2', options)).toBe(true);
      expect(fetch.mock.calls[1]![0]).toBe('http://core-api.internal/api/v1/feed?author_id=u2&limit=1');
    });

    it('trả false khi không có bài và không có Reels', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(json(emptyPage))
        .mockResolvedValueOnce(json(emptyPage));
      expect(await seoApi.hasPublicContent('u3', options)).toBe(false);
    });

    it('bỏ qua bài riêng tư, đã xoá rồi xét tiếp Reels', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          json({
            ...emptyPage,
            items: [
              { id: 'x1', visibility: 'private', status: 'published', deletedAt: null },
              { id: 'x2', visibility: 'public', status: 'published', deletedAt: '2026-11-01T00:00:00.000Z' },
            ],
          }),
        )
        .mockResolvedValueOnce(json(emptyPage));
      expect(await seoApi.hasPublicContent('u4', options)).toBe(false);
    });

    it('không gửi token người dùng khi đọc cả hai nguồn', async () => {
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(json(emptyPage))
        .mockResolvedValueOnce(json(emptyPage));
      await seoApi.hasPublicContent('u5', options);
      for (const [, init] of fetch.mock.calls)
        expect(new Headers(init?.headers).get('authorization')).toBeNull();
    });

    it('ném lỗi khi API trả sai dạng, để trang chuyển về noindex', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ nope: true }));
      await expect(seoApi.hasPublicContent('u6', options)).rejects.toThrow('Unexpected API page');
    });
  });

  it('getPostDetail trả đủ post, viewerContext, shareUrl như socialApi.getPost', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json({
        post: { id: 'p1', title: 'Đà Lạt' },
        viewerContext: { myReaction: null },
        shareUrl: 'https://x/p1',
      }),
    );
    const detail = await seoApi.getPostDetail('p1', options);
    expect(Object.keys(detail).sort()).toEqual(['post', 'shareUrl', 'viewerContext']);
    expect(detail.shareUrl).toBe('https://x/p1');
  });

  it('listAuthorVlogs gọi đúng tham số author_id và post_type=vlog, ẩn danh', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ items: [], nextCursor: null, hasMore: false }));
    await seoApi.listAuthorVlogs('u1', options);
    expect(fetch.mock.calls[0]![0]).toBe('http://core-api.internal/api/v1/posts?author_id=u1&post_type=vlog');
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get('authorization')).toBeNull();
  });

  it('rejects a malformed page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ nope: true }));
    await expect(seoApi.listPosts(undefined, options)).rejects.toThrow('Unexpected API page');
  });
});
