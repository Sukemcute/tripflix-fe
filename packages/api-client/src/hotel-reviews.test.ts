import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { getHotelReviews } from './hotel-reviews';

const response = {
  hotelId: 'hotel/1',
  summary: { average: 4.6, count: 20, distribution: [], tags: [], aiSummary: null },
  items: [],
  total: 2,
  page: 2,
  limit: 5,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => configureHttp({ baseUrl: 'https://gateway.example' }));
afterEach(() => vi.restoreAllMocks());

describe('hotel reviews API', () => {
  it('sends the selected review filters, pagination and encoded hotel id', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(response));
    const signal = new AbortController().signal;
    expect(
      await getHotelReviews(
        'hotel/1',
        { sort: 'helpful', rating: 5, tag: 'Gần biển & yên tĩnh', travelerType: 'family', page: 2, limit: 5 },
        signal,
      ),
    ).toEqual(response);
    const url = new URL(String(send.mock.calls[0]![0]));
    expect(url.pathname).toBe('/api/hotels/hotel%2F1/reviews');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      sort: 'helpful',
      rating: '5',
      tag: 'Gần biển & yên tĩnh',
      travelerType: 'family',
      page: '2',
      limit: '5',
    });
    expect(send.mock.calls[0]![1]?.signal).toBe(signal);
  });

  it('omits cleared filters instead of sending empty or undefined query values', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(response));
    await getHotelReviews('hotel', { rating: undefined, tag: '', page: 1 });
    expect(Object.fromEntries(new URL(String(send.mock.calls[0]![0])).searchParams)).toEqual({ page: '1' });
  });

  it('rejects an unexpected response instead of treating it as an empty review list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ items: [] }));
    await expect(getHotelReviews('hotel')).rejects.toThrow();
  });

  it('preserves server errors for the retry and not-found states', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ message: 'Not found' }, 404));
    await expect(getHotelReviews('missing')).rejects.toMatchObject({ status: 404 });
  });
});
