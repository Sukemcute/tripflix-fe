import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { getAvailableStays, useStaySearch, type StayFilters } from './stay-search';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: undefined,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('./session', () => ({
  useApiSession: vi.fn().mockReturnValue({
    isReady: true,
    user: null,
    error: null,
    session: null,
  }),
}));

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const filters: StayFilters = {
  placeId: 'nha-trang',
  checkIn: '2026-11-10',
  checkOut: '2026-11-12',
  adults: '2',
  rooms: '',
  minStars: '',
  priceMin: '',
  priceMax: '',
  sort: 'price',
};
beforeEach(() => configureHttp({ baseUrl: 'https://gateway.example' }));
afterEach(() => vi.restoreAllMocks());

describe('getAvailableStays', () => {
  it('gửi limit và cursor để lấy đúng một trang kết quả', async () => {
    const page = { items: [], nextCursor: '10', total: 12 };
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page));
    expect(await getAvailableStays(filters, { cursor: '5', limit: 5 })).toEqual(page);
    const url = new URL(String(send.mock.calls[0]![0]));
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('cursor')).toBe('5');
    expect(url.searchParams.get('placeId')).toBe('nha-trang');
    expect(url.searchParams.has('minStars')).toBe(false);
  });

  it('gửi đúng hạng sao và sắp giá cao trước', async () => {
    const send = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ items: [], nextCursor: null, total: 0 }));
    await getAvailableStays({ ...filters, stars: '3', sort: 'price_desc' });
    const url = new URL(String(send.mock.calls[0]![0]));
    expect(url.searchParams.get('stars')).toBe('3');
    expect(url.searchParams.get('sort')).toBe('price_desc');
  });
});

let mockStates: unknown[] = [];
let mockIndex = 0;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const idx = mockIndex++;
      if (!(idx in mockStates)) {
        mockStates[idx] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      }
      const setState = (next: unknown) => {
        mockStates[idx] = typeof next === 'function' ? (next as (prev: unknown) => unknown)(mockStates[idx]) : next;
      };
      return [mockStates[idx], setState];
    },
    useEffect: () => {},
    useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

describe('useStaySearch hook apply', () => {
  it('cập nhật text, reset selection, cập nhật filters và submitted khi gọi apply', () => {
    mockStates = [];
    function renderHook() {
      mockIndex = 0;
      return useStaySearch('Hà Nội', { placeId: 'ha-noi' });
    }

    const initial = renderHook();
    expect(initial.text).toBe('Hà Nội');
    expect(initial.filters.placeId).toBe('ha-noi');
    expect(initial.submitted?.placeId).toBe('ha-noi');

    const newFilters: StayFilters = {
      placeId: 'da-nang',
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      adults: '3',
      rooms: '1',
      minStars: '4',
      priceMin: '1000000',
      priceMax: '3000000',
      sort: 'stars',
    };

    initial.apply('Đà Nẵng', newFilters);

    const updated = renderHook();
    expect(updated.text).toBe('Đà Nẵng');
    expect(updated.selection).toBeNull();
    expect(updated.filters.placeId).toBe('da-nang');
    expect(updated.filters.minStars).toBe('4');
    expect(updated.filters.sort).toBe('stars');
    expect(updated.submitted).toEqual(newFilters);
  });
});
