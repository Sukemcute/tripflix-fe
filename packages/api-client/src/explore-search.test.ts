import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExploreResults, getPostSearchResults, searchUsers } from './explore-search';
import { configureHttp } from './http';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => configureHttp({ baseUrl: 'https://gateway.example' }));
afterEach(() => vi.restoreAllMocks());

describe('explore search API', () => {
  it('posts the query to /api/search and returns the sections', async () => {
    const body = {
      understood: { place: 'Đà Lạt', intents: [], budget: 1_000_000, days: null, names: [], phrases: [], fixed: {} },
      nearUser: false,
      sections: [{ kind: 'stay', label: 'Ở đâu', total: 0, items: [] }],
      suggest: [],
      dropped: [],
    };
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(body));
    expect(await getExploreResults('homestay đà lạt dưới 1 triệu')).toEqual(body);
    const [url, init] = send.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/api/search');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ q: 'homestay đà lạt dưới 1 triệu' });
  });

  it('rejects a response without sections', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ understood: {} }));
    await expect(getExploreResults('đà lạt')).rejects.toThrow('Unexpected API response');
  });

  it('posts search query to /api/search/posts and returns items and understood', async () => {
    const body = {
      understood: { place: 'Đà Lạt', intents: ['plan'], budget: 3_000_000, days: 3, names: [], phrases: [], fixed: {} },
      items: [
        {
          id: 'plan:p1',
          kind: 'plan',
          refId: 'trip_dalat_3n2d',
          title: 'Đà Lạt 3N2Đ chill',
          subtitle: 'Đà Lạt',
          thumbnail: 'https://example.com/cover.jpg',
          reason: '3 ngày · 1500 lượt thích',
          priceFrom: 2_500_000,
          days: 3,
          location: null,
        },
      ],
      total: 1,
      nextCursor: null,
    };
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(body));
    const result = await getPostSearchResults({ q: 'lịch trình đà lạt 3n2đ dưới 3tr' });
    expect(result).toEqual(body);
    const [url, init] = send.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/api/search/posts');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ q: 'lịch trình đà lạt 3n2đ dưới 3tr' });
  });

  it('rejects searchPosts response missing required fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ understood: {} }));
    await expect(getPostSearchResults({ q: 'đà lạt' })).rejects.toThrow('Unexpected API response');
  });

  it('gets public users by name from /api/v1/users/search', async () => {
    const body = { items: [{ id: 'u1', displayName: 'Bảo' }], page: 1, hasMore: false };
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(body));
    expect(await searchUsers('bao')).toEqual(body);
    const url = new URL(String(send.mock.calls[0]![0]));
    expect(url.pathname).toBe('/api/v1/users/search');
    expect(url.searchParams.get('q')).toBe('bao');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('rejects a user search response without items', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ page: 1 }));
    await expect(searchUsers('bao')).rejects.toThrow('Unexpected API response');
  });
});
