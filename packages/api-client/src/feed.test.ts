import { afterEach, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import { feedApi, REELS_BY_IDS_PAGE_SIZE, sliceReelIdsPage } from './feed';

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

it('requests the selected tab', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => null });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(json(200, { items: [], nextCursor: null }));
  await feedApi.list(undefined, undefined, 'hot');
  expect(new URL(String(fetchMock.mock.calls[0]![0])).searchParams.get('tab')).toBe('hot');
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

it('requests only the viewer saved Reels on the for_you tab', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => 'test-session' });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(json(200, { items: [], nextCursor: null }));
  await feedApi.list(undefined, undefined, 'hot', { isSavedOnly: true });
  const params = new URL(String(fetchMock.mock.calls[0]![0])).searchParams;
  expect(params.get('saved')).toBe('true');
  expect(params.get('tab')).toBe('for_you');
});

it('requests Reels cards for exact post ids as one comma-separated post_ids parameter', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => null });
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(json(200, { items: [], nextCursor: null }));
  await feedApi.listByIds(['p2', 'p1']);
  const url = new URL(String(fetchMock.mock.calls[0]![0]));
  expect(Object.fromEntries(url.searchParams)).toEqual({ post_ids: 'p2,p1' });
});

it('splits post ids into pages no larger than the backend limit, keeping order', () => {
  const ids = Array.from({ length: REELS_BY_IDS_PAGE_SIZE + 3 }, (_, index) => `p${index}`);
  const first = sliceReelIdsPage(ids, 0);
  expect(first.ids).toHaveLength(REELS_BY_IDS_PAGE_SIZE);
  expect(first.ids[0]).toBe('p0');
  expect(first.nextOffset).toBe(REELS_BY_IDS_PAGE_SIZE);
  const second = sliceReelIdsPage(ids, first.nextOffset!);
  expect(second.ids).toEqual([`p${REELS_BY_IDS_PAGE_SIZE}`, `p${REELS_BY_IDS_PAGE_SIZE + 1}`, `p${REELS_BY_IDS_PAGE_SIZE + 2}`]);
  expect(second.nextOffset).toBeNull();
  expect(sliceReelIdsPage(ids.slice(0, REELS_BY_IDS_PAGE_SIZE), 0).nextOffset).toBeNull();
});
