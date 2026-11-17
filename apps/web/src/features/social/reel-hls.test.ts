import { describe, expect, it, vi } from 'vitest';
import {
  attachReelHlsSource,
  isPlaybackAuthError,
  type ReelHlsErrorData,
  type ReelHlsLibrary,
  type ReelHlsPlayer,
} from './reel-hls';

const URL = 'https://media.test/staging/videos/a/master.m3u8';

function createFakeVideo({ canPlayNative }: { canPlayNative: boolean }) {
  const video = {
    src: '',
    canPlayType: vi.fn(() => (canPlayNative ? 'maybe' : '') as CanPlayTypeResult),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn((name: string) => {
      if (name === 'src') video.src = '';
    }),
  };
  return video;
}

function createFakeLibrary({ isSupported = true }: { isSupported?: boolean } = {}) {
  let errorListener: ((event: 'hlsError', data: ReelHlsErrorData) => void) | undefined;
  const player: ReelHlsPlayer = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn((_event, listener) => {
      errorListener = listener;
    }),
    destroy: vi.fn(),
  };
  const configs: { xhrSetup: (xhr: XMLHttpRequest) => void }[] = [];
  const library: ReelHlsLibrary = {
    isSupported: () => isSupported,
    create: (config) => {
      configs.push(config);
      return player;
    },
  };
  return { library, player, configs, emitError: (data: ReelHlsErrorData) => errorListener?.('hlsError', data) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const callbacks = () => ({ onAuthError: vi.fn(), onFatalError: vi.fn() });

describe('attachReelHlsSource', () => {
  it('trình duyệt phát HLS sẵn (Safari): dùng thẻ <video>, không tải hls.js', () => {
    const video = createFakeVideo({ canPlayNative: true });
    const loadLibrary = vi.fn();
    attachReelHlsSource(video, URL, { ...callbacks(), loadLibrary });
    expect(video.src).toBe(URL);
    expect(loadLibrary).not.toHaveBeenCalled();
  });

  it('Chrome, Firefox máy tính: phát bằng hls.js, XHR gửi kèm cookie CloudFront', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary();
    attachReelHlsSource(video, URL, { ...callbacks(), loadLibrary: async () => fake.library });
    await flush();

    expect(fake.player.loadSource).toHaveBeenCalledWith(URL);
    expect(fake.player.attachMedia).toHaveBeenCalledWith(video);
    const xhr = { withCredentials: false } as XMLHttpRequest;
    fake.configs[0]!.xhrSetup(xhr);
    expect(xhr.withCredentials).toBe(true);
  });

  it('dọn trước khi hls.js tải xong thì không gắn nữa (lướt nhanh qua Reel)', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary();
    const release = attachReelHlsSource(video, URL, { ...callbacks(), loadLibrary: async () => fake.library });
    release();
    await flush();
    expect(fake.player.loadSource).not.toHaveBeenCalled();
    expect(video.load).toHaveBeenCalled();
  });

  it('dọn: huỷ hls.js và nhả thẻ <video> để ngắt tải segment', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary();
    const release = attachReelHlsSource(video, URL, { ...callbacks(), loadLibrary: async () => fake.library });
    await flush();
    release();
    expect(fake.player.destroy).toHaveBeenCalled();
    expect(video.removeAttribute).toHaveBeenCalledWith('src');
  });

  it('lỗi do cookie (403) thì xin cookie mới; lỗi khác thì báo lỗi phát; lỗi không làm dừng thì bỏ qua', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary();
    const handlers = callbacks();
    attachReelHlsSource(video, URL, { ...handlers, loadLibrary: async () => fake.library });
    await flush();

    fake.emitError({ fatal: false, type: 'networkError', response: { code: 403 } });
    expect(handlers.onAuthError).not.toHaveBeenCalled();
    fake.emitError({ fatal: true, type: 'networkError', response: { code: 403 } });
    expect(handlers.onAuthError).toHaveBeenCalledTimes(1);
    fake.emitError({ fatal: true, type: 'mediaError' });
    expect(handlers.onFatalError).toHaveBeenCalledTimes(1);
  });

  it('không có MSE: vẫn gắn src để thẻ <video> báo lỗi như trước', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary({ isSupported: false });
    attachReelHlsSource(video, URL, { ...callbacks(), loadLibrary: async () => fake.library });
    await flush();
    expect(video.src).toBe(URL);
  });

  it('tải hls.js lỗi (mạng chập chờn) thì báo lỗi phát', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const handlers = callbacks();
    attachReelHlsSource(video, URL, { ...handlers, loadLibrary: () => Promise.reject(new Error('chunk')) });
    await flush();
    expect(handlers.onFatalError).toHaveBeenCalled();
  });
});

describe('isPlaybackAuthError', () => {
  it('chỉ lỗi mạng làm dừng phát với mã 403 hoặc 0 (bị chặn CORS) mới là lỗi cookie', () => {
    expect(isPlaybackAuthError({ fatal: true, type: 'networkError', response: { code: 403 } })).toBe(true);
    expect(isPlaybackAuthError({ fatal: true, type: 'networkError', response: { code: 0 } })).toBe(true);
    expect(isPlaybackAuthError({ fatal: true, type: 'networkError', response: { code: 404 } })).toBe(false);
    expect(isPlaybackAuthError({ fatal: false, type: 'networkError', response: { code: 403 } })).toBe(false);
    expect(isPlaybackAuthError({ fatal: true, type: 'mediaError' })).toBe(false);
  });
});
