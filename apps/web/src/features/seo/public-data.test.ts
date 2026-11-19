import { afterEach, describe, expect, it, vi } from 'vitest';
import { makePost } from './seo-fixtures';

const { getHotel, listPublicPosts, reactCache, resetReactCache } = vi.hoisted(() => {
  const caches: Map<string, unknown>[] = [];
  return {
    getHotel: vi.fn(),
    listPublicPosts: vi.fn(),
    resetReactCache: () => {
      for (const map of caches) map.clear();
    },
    reactCache: <T extends (...args: never[]) => unknown>(fn: T) => {
      const store = new Map<string, unknown>();
      caches.push(store);
      return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        if (!store.has(key)) store.set(key, fn(...args));
        return store.get(key) as ReturnType<T>;
      }) as T;
    },
  };
});

vi.mock('react', () => ({ cache: reactCache }));
vi.mock('@tripflix/api-client/seo', () => ({
  seoApi: { getHotel, getPost: vi.fn(), getProfile: vi.fn() },
}));
vi.mock('@tripflix/api-client/core-api/social-posts/social-posts', () => ({
  postsControllerListPublicPosts: listPublicPosts,
}));

import { findPublicHotel, hasPublicProfilePosts, LOOKUP_TIMEOUT_MS } from './public-data';

afterEach(() => {
  getHotel.mockReset();
  listPublicPosts.mockReset();
  resetReactCache();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('findPublic*', () => {
  it('trả dữ liệu và gọi API theo API_INTERNAL_URL kèm signal có timeout', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://gateway:8080');
    getHotel.mockResolvedValueOnce({ id: 'h1', name: 'Vinpearl' });
    expect(await findPublicHotel('h1')).toEqual({ id: 'h1', name: 'Vinpearl' });
    const [, options] = getHotel.mock.calls[0]!;
    expect(options.baseUrl).toBe('http://gateway:8080');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('trả null khi API lỗi, để trang dùng metadata dự phòng', async () => {
    getHotel.mockRejectedValueOnce(new Error('HTTP 503'));
    expect(await findPublicHotel('h2')).toBeNull();
  });

  it('trả null khi API chậm quá timeout', async () => {
    vi.useFakeTimers();
    getHotel.mockImplementationOnce(
      (_id: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason));
        }),
    );
    const pending = findPublicHotel('h3');
    await vi.advanceTimersByTimeAsync(LOOKUP_TIMEOUT_MS + 10);
    expect(await pending).toBeNull();
  });

  it('hasPublicProfilePosts gọi ẩn danh với limit=1, trả true khi có bài công khai và không gọi trùng qua cache()', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://gateway:8080');
    listPublicPosts.mockResolvedValueOnce({ status: 200, data: { items: [makePost()], nextCursor: null, hasMore: false } });

    expect(await hasPublicProfilePosts('u1')).toBe(true);
    expect(await hasPublicProfilePosts('u1')).toBe(true);
    expect(listPublicPosts).toHaveBeenCalledTimes(1);

    const [params, options] = listPublicPosts.mock.calls[0]!;
    expect(params).toEqual({ author_id: 'u1', limit: 1 });
    expect(options).toMatchObject({
      baseUrl: 'http://gateway:8080',
      skipAuthorization: true,
      skipAuthRefresh: true,
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('hasPublicProfilePosts trả false khi hồ sơ chưa có bài công khai', async () => {
    listPublicPosts.mockResolvedValueOnce({ status: 200, data: { items: [], nextCursor: null, hasMore: false } });
    expect(await hasPublicProfilePosts('u-empty')).toBe(false);
  });

  it('hasPublicProfilePosts trả null khi API lỗi hoặc quá timeout để chuyển về noindex an toàn', async () => {
    listPublicPosts.mockRejectedValueOnce(new Error('HTTP 503'));
    expect(await hasPublicProfilePosts('u-err')).toBeNull();

    vi.useFakeTimers();
    listPublicPosts.mockImplementationOnce(
      (_params: unknown, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason));
        }),
    );
    const pending = hasPublicProfilePosts('u-timeout');
    await vi.advanceTimersByTimeAsync(LOOKUP_TIMEOUT_MS + 10);
    expect(await pending).toBeNull();
  });
});
