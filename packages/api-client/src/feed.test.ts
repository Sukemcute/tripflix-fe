import { afterEach, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import { feedApi } from './feed';

afterEach(() => vi.restoreAllMocks());
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

it('loads the public feed and passes opaque cursors and cancellation to the generated client', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => null });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(json(200, { items: [], nextCursor: 'next' }));
  const controller = new AbortController();
  expect((await feedApi.list('opaque+/=', controller.signal)).nextCursor).toBe('next');
  const url = new URL(String(fetchMock.mock.calls[0]![0]));
  expect(url.pathname).toBe('/api/v1/feed');
  expect(Object.fromEntries(url.searchParams)).toEqual({ cursor: 'opaque+/=', limit: '10', tab: 'for_you' });
  expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal);
  expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).has('authorization')).toBe(false);
});

it('uses the current session to obtain viewer state without making authentication mandatory', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => 'test-session' });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(json(200, { items: [], nextCursor: null }));
  await feedApi.list();
  expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get('authorization')).toBe('Bearer test-session');
});

it('retains HTTP failures for retry and rejects malformed feed pages', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => null });
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json(503, { message: 'Unavailable' }))
    .mockResolvedValueOnce(json(200, { items: null }));
  await expect(feedApi.list()).rejects.toBeInstanceOf(HttpError);
  await expect(feedApi.list()).rejects.toThrow('Unexpected API page');
});
