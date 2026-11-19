import { afterEach, describe, expect, it, vi } from 'vitest';

const { getHotel } = vi.hoisted(() => ({ getHotel: vi.fn() }));
vi.mock('@tripflix/api-client/seo', () => ({
  seoApi: { getHotel, getPost: vi.fn(), getProfile: vi.fn() },
}));

import { findPublicHotel, LOOKUP_TIMEOUT_MS } from './public-data';

afterEach(() => {
  getHotel.mockReset();
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
