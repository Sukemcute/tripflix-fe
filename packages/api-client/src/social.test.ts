import { afterEach, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import { socialApi } from './social';

afterEach(() => vi.restoreAllMocks());
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
it('uses the generated social wire format and includes a write idempotency key', async () => {
  configureHttp({ baseUrl: 'http://api' });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(json(200, { postId: 'post-1', isBookmarked: true, bookmarkCount: 1 }));
  await socialApi.setBookmark('post-1', true);
  expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api/api/v1/posts/post-1/bookmark');
  const init = fetchMock.mock.calls[0]![1]!;
  expect(JSON.parse(String(init.body))).toEqual({ is_bookmarked: true });
  expect(new Headers(init.headers).get('idempotency-key')).toBeTruthy();
});
it('sends an explicit comment reaction so repeating a like cannot toggle it off', async () => {
  configureHttp({ baseUrl: 'http://api' });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => json(200, { commentId: 'comment-1', isLiked: true, likeCount: 1 }));
  await socialApi.setCommentReaction('comment-1', true);
  await socialApi.setCommentReaction('comment-1', false);
  expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api/api/v1/comments/comment-1/reaction');
  expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT');
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ type: 'like' });
  expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ type: null });
});
it('sends snake_case comment parent fields and retains errors for the UI to retry', async () => {
  configureHttp({ baseUrl: '' });
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(422, { message: 'invalid' }));
  await expect(socialApi.addComment('post-1', 'hello', 'parent-1')).rejects.toBeInstanceOf(HttpError);
  expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
    body: 'hello',
    parent_comment_id: 'parent-1',
  });
});
it('passes pagination cursors unchanged and rejects malformed pages', async () => {
  configureHttp({ baseUrl: '' });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json(200, { items: [], nextCursor: 'opaque+/=', hasMore: true }))
    .mockResolvedValueOnce(json(200, { unexpected: [] }));
  expect((await socialApi.listPosts({ cursor: 'opaque+/=' })).nextCursor).toBe('opaque+/=');
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain('cursor=opaque%2B%2F%3D');
  await expect(socialApi.listPosts()).rejects.toThrow('Unexpected API page');
});
