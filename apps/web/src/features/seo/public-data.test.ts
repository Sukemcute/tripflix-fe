import { afterEach, describe, expect, it, vi } from 'vitest';

const { getHotel, hasPublicContent, reactCache, resetReactCache } = vi.hoisted(() => {
  const caches: Map<string, unknown>[] = [];
  return {
    getHotel: vi.fn(),
    hasPublicContent: vi.fn(),
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
  seoApi: { getHotel, getPost: vi.fn(), getProfile: vi.fn(), hasPublicContent },
}));

import { findPublicHotel, hasPublicProfilePosts, LOOKUP_TIMEOUT_MS } from './public-data';

afterEach(() => {
  getHotel.mockReset();
  hasPublicContent.mockReset();
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
});

describe('hasPublicProfilePosts (bài hoặc Reels)', () => {
  it('gọi seoApi.hasPublicContent với baseUrl và signal, không gọi lại trong cùng request', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://gateway:8080');
    hasPublicContent.mockResolvedValueOnce(true);

    expect(await hasPublicProfilePosts('u1')).toBe(true);
    expect(await hasPublicProfilePosts('u1')).toBe(true);
    expect(hasPublicContent).toHaveBeenCalledTimes(1);

    const [userId, options] = hasPublicContent.mock.calls[0]!;
    expect(userId).toBe('u1');
    expect(options.baseUrl).toBe('http://gateway:8080');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('trả false khi hồ sơ chưa có bài hoặc Reels công khai', async () => {
    hasPublicContent.mockResolvedValueOnce(false);
    expect(await hasPublicProfilePosts('u-empty')).toBe(false);
  });

  it('trả null khi API lỗi, để noindex an toàn', async () => {
    hasPublicContent.mockRejectedValueOnce(new Error('HTTP 503'));
    expect(await hasPublicProfilePosts('u-err')).toBeNull();
  });

  it('trả null khi kiểm tra quá timeout, để noindex an toàn', async () => {
    vi.useFakeTimers();
    hasPublicContent.mockImplementationOnce(
      (_userId: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason));
        }),
    );
    const pending = hasPublicProfilePosts('u-timeout');
    await vi.advanceTimersByTimeAsync(LOOKUP_TIMEOUT_MS + 10);
    expect(await pending).toBeNull();
  });
});
