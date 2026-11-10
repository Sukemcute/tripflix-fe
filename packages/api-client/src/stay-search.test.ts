import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { getAvailableStays, type StayFilters } from './stay-search';

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
