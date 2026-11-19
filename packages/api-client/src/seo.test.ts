import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { seoApi } from './seo';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const options = { baseUrl: 'http://core-api.internal' };

beforeEach(() =>
  configureHttp({ baseUrl: 'https://browser-gateway.example', getAccessToken: () => 'user-access-token' }),
);
afterEach(() => vi.restoreAllMocks());

describe('seoApi', () => {
  it('reads a hotel from its own base URL without the user token', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ id: 'h1', slug: 'vinpearl nha trang', name: 'Vinpearl' }));
    const hotel = await seoApi.getHotel('vinpearl nha trang', options);
    expect(hotel.name).toBe('Vinpearl');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('http://core-api.internal/api/hotels/vinpearl%20nha%20trang');
    expect(new Headers(init?.headers).get('authorization')).toBeNull();
  });

  it('returns the post inside the detail envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ post: { id: 'p1', title: 'Đà Lạt 3 ngày' } }));
    expect((await seoApi.getPost('p1', options)).title).toBe('Đà Lạt 3 ngày');
  });

  it('does not try to refresh a session when the API answers 401', async () => {
    const refresh = vi.fn(async () => true);
    configureHttp({ baseUrl: 'https://browser-gateway.example', refreshAccessToken: refresh });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ message: 'no' }, 401));
    await expect(seoApi.getProfile('u1', options)).rejects.toThrow('HTTP 401');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('pages public posts 50 at a time with the cursor', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ items: [], nextCursor: null, hasMore: false }));
    await seoApi.listPosts('c2', options);
    expect(fetch.mock.calls[0]![0]).toBe('http://core-api.internal/api/v1/posts?limit=50&cursor=c2');
  });

  it('rejects a malformed page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ nope: true }));
    await expect(seoApi.listPosts(undefined, options)).rejects.toThrow('Unexpected API page');
  });
});
