import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHomeRecommendations } from './recommendations';
import { configureHttp } from './http';
import type { HomeDestinationPickDto } from './generated/core-api/model';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => configureHttp({ baseUrl: 'https://gateway.example' }));
afterEach(() => vi.restoreAllMocks());

describe('home recommendations API', () => {
  it('calls /api/recommendations/home with query params and returns items', async () => {
    const mockItems: HomeDestinationPickDto[] = [
      {
        province: { slug: 'da-lat', name: 'Đà Lạt' },
        hotels: [
          {
            hotelId: 'P-vn-h-da-lat-1',
            name: 'Dalat Edensee Lake Resort',
            thumbnail: '/images/hotel.jpg',
            stars: 5,
            brand: null,
            priceFrom: 1_850_000,
            reason: { code: 'recent_place', text: 'Vì bạn vừa tìm Đà Lạt' },
          },
        ],
        totalDealsCount: 3,
        otherDealsCount: 2,
      },
    ];
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ items: mockItems }));

    const res = await getHomeRecommendations({ recentPlaceIds: ['da-lat'], limit: 6 });
    expect(res).toEqual(mockItems);

    const [url, init] = send.mock.calls[0]!;
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/api/recommendations/home');
    expect(parsedUrl.searchParams.get('recentPlaceIds')).toBe('da-lat');
    expect(parsedUrl.searchParams.get('limit')).toBe('6');
    expect(init?.method).toBe('GET');
  });

  it('handles empty response gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ items: [] }));
    const res = await getHomeRecommendations();
    expect(res).toEqual([]);
  });
});
