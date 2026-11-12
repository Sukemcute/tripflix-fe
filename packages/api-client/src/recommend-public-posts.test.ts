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
    expect(Object.fromEntries(url.searchParams)).toEqual({ mode: 'for_you', limit: '10', cursor: 'c1', postType: 'vlog' });
  });
});
