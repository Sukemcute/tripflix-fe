import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExploreResults } from './explore-search';
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
});
