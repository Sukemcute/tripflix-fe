import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getExploreResults,
  getPostSearchResults,
  normalizeUserSearchQuery,
  searchUsers,
  useInfiniteUserSearch,
  useUserSearch,
} from './explore-search';
import { configureHttp } from './http';

const hooks = vi.hoisted(() => ({
  session: vi.fn(),
  query: vi.fn(),
  infiniteQuery: vi.fn(),
  keepPreviousData: vi.fn(),
}));
vi.mock('./session', () => ({ useApiSession: hooks.session }));
vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: hooks.keepPreviousData,
  useQuery: hooks.query,
  useInfiniteQuery: hooks.infiniteQuery,
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => {
  vi.clearAllMocks();
  configureHttp({ baseUrl: 'https://gateway.example' });
  hooks.session.mockReturnValue({ isReady: true });
  hooks.query.mockReturnValue({ data: undefined });
  hooks.infiniteQuery.mockReturnValue({ data: undefined });
});
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

describe('normalizeUserSearchQuery', () => {
  it('normalizes NFKC, lowercases in vi locale, and collapses/trims whitespace', () => {
    expect(normalizeUserSearchQuery('  \uFF42\u1EA3\uFF4F  ')).toEqual({ query: 'bảo', isSearchable: true });
    expect(normalizeUserSearchQuery('  nguyễn   văn   an  ')).toEqual({ query: 'nguyễn văn an', isSearchable: true });
    expect(normalizeUserSearchQuery('  NGUYỄN   Văn   An  ')).toEqual({ query: 'nguyễn văn an', isSearchable: true });
    expect(normalizeUserSearchQuery('Đà Lạt')).toEqual({ query: 'đà lạt', isSearchable: true });
    expect(normalizeUserSearchQuery('  \uFF41  ')).toEqual({ query: 'a', isSearchable: false });
  });

  it('requires at least 2 folded non-space characters after stripping Vietnamese diacritics', () => {
    expect(normalizeUserSearchQuery('a').isSearchable).toBe(false);
    expect(normalizeUserSearchQuery('a\u0301').isSearchable).toBe(false);
    expect(normalizeUserSearchQuery('  a  ').isSearchable).toBe(false);
    expect(normalizeUserSearchQuery('bảo').isSearchable).toBe(true);
    expect(normalizeUserSearchQuery('an').isSearchable).toBe(true);
    expect(normalizeUserSearchQuery('a b').isSearchable).toBe(true);
  });

  it('enforces max 50 characters and rejects control characters', () => {
    expect(normalizeUserSearchQuery('a'.repeat(50)).isSearchable).toBe(true);
    expect(normalizeUserSearchQuery(`  ${'a'.repeat(50)}  `).isSearchable).toBe(true);
    expect(normalizeUserSearchQuery('a'.repeat(51)).isSearchable).toBe(false);
    expect(normalizeUserSearchQuery('an\u0000').isSearchable).toBe(false);
    expect(normalizeUserSearchQuery('an\u0007').isSearchable).toBe(false);
  });
});

describe('useUserSearch & useInfiniteUserSearch', () => {
  it.each([
    { isReady: false, q: 'bảo', expectedQuery: 'bảo', isSearchable: true, enabled: false },
    { isReady: true, q: '  a\u0301  ', expectedQuery: 'á', isSearchable: false, enabled: false },
    { isReady: true, q: '  bảo   nguyễn  ', expectedQuery: 'bảo nguyễn', isSearchable: true, enabled: true },
  ])('configures useInfiniteUserSearch for %j', ({ isReady, q, expectedQuery, isSearchable, enabled }) => {
    hooks.session.mockReturnValue({ isReady });
    const mockState = { data: { pages: [] }, fetchNextPage: vi.fn() };
    hooks.infiniteQuery.mockReturnValue(mockState);

    const result = useInfiniteUserSearch(q);

    expect(hooks.infiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['discovery', 'users', 'infinite', expectedQuery],
        enabled,
        initialPageParam: 1,
        retry: false,
      }),
    );
    expect(result).toEqual({ ...mockState, isSearchable });
  });

  it('wires queryFn and getNextPageParam for paginated user search', async () => {
    const page1 = { items: [{ id: 'u1', displayName: 'Bảo' }], page: 1, hasMore: true };
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page1));
    useInfiniteUserSearch('  bảo  ');

    const options = hooks.infiniteQuery.mock.lastCall![0] as {
      queryFn: (ctx: { pageParam: number; signal?: AbortSignal }) => Promise<typeof page1>;
      getNextPageParam: (page: { items: unknown[]; page: number; hasMore: boolean }) => number | undefined;
    };

    const controller = new AbortController();
    expect(await options.queryFn({ pageParam: 2, signal: controller.signal })).toEqual(page1);
    const [url, init] = send.mock.calls[0]!;
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/api/v1/users/search');
    expect(parsedUrl.searchParams.get('q')).toBe('bảo');
    expect(parsedUrl.searchParams.get('page')).toBe('2');
    expect(init?.signal).toBe(controller.signal);

    expect(options.getNextPageParam({ items: [], page: 1, hasMore: true })).toBe(2);
    expect(options.getNextPageParam({ items: [], page: 5, hasMore: false })).toBeUndefined();
  });

  it('shares normalization logic in useUserSearch with case-insensitive key, staleTime 60s and keepPreviousData', () => {
    hooks.query.mockReturnValue({ data: undefined });
    const shortResult = useUserSearch('  A  ');
    expect(hooks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['discovery', 'users', 'a'],
        enabled: false,
        staleTime: 60_000,
        placeholderData: hooks.keepPreviousData,
        retry: false,
      }),
    );
    expect(shortResult.isSearchable).toBe(false);

    useUserSearch('Nguyen');
    useUserSearch('nguyen');
    expect(hooks.query.mock.calls[1]![0].queryKey).toEqual(['discovery', 'users', 'nguyen']);
    expect(hooks.query.mock.calls[2]![0].queryKey).toEqual(['discovery', 'users', 'nguyen']);

    useInfiniteUserSearch('Nguyen');
    expect(hooks.infiniteQuery.mock.lastCall![0].queryKey).toEqual(['discovery', 'users', 'infinite', 'nguyen']);
  });
});
