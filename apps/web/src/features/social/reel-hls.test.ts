import { describe, expect, it, vi } from 'vitest';
import {
  attachReelHlsSource,
  isPlaybackAuthError,
  pickReelStartLevel,
  REEL_RENDITION_TIMEOUT_MS,
  type ReelHlsBufferControl,
  type ReelHlsConfig,
  type ReelHlsErrorData,
  type ReelHlsLevel,
  type ReelHlsLibrary,
  type ReelHlsPlayer,
} from './reel-hls';

const URL = 'https://media.test/staging/videos/a/master.m3u8';
const RENDITIONS = [
  'https://media.test/staging/videos/a/720p/index.m3u8',
  'https://media.test/staging/videos/a/540p/index.m3u8',
  URL,
];

function createFakeVideo({ canPlayNative }: { canPlayNative: boolean }) {
  const listeners = new Map<string, Set<() => void>>();
  const video = {
    src: '',
    canPlayType: vi.fn(() => (canPlayNative ? 'maybe' : '') as CanPlayTypeResult),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn((name: string) => {
      if (name === 'src') video.src = '';
    }),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener));
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener);
    }),
    paused: true,
    readyState: 0,
    currentTime: 0,
    play: vi.fn(async () => {
      video.paused = false;
    }),
    /** Giả lập thẻ <video> bắn sự kiện (error, loadeddata). */
    emit: (event: string) => {
      for (const listener of [...(listeners.get(event) ?? [])]) listener();
    },
  };
  return video;
}

function createFakeLibrary({ isSupported = true }: { isSupported?: boolean } = {}) {
  const listeners = new Map<string, (event: string, data: unknown) => void>();
  const player: ReelHlsPlayer = {
    config: { maxBufferLength: 0, maxMaxBufferLength: 0 },
    startLevel: -1,
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    startLoad: vi.fn(),
    on: vi.fn((event: string, listener: (event: string, data: unknown) => void) => {
      listeners.set(event, listener);
    }) as ReelHlsPlayer['on'],
    destroy: vi.fn(),
  };
  const configs: ReelHlsConfig[] = [];
  const library: ReelHlsLibrary = {
    isSupported: () => isSupported,
    create: (config) => {
      configs.push(config);
      player.config.maxBufferLength = config.maxBufferLength;
      player.config.maxMaxBufferLength = config.maxMaxBufferLength;
      return player;
    },
  };
  const emit = (event: string, data: unknown) => listeners.get(event)?.(event, data);
  return {
    library,
    player,
    configs,
    emitError: (data: ReelHlsErrorData) => emit('hlsError', data),
    emitManifest: (levels: ReelHlsLevel[]) => emit('hlsManifestParsed', { levels }),
  };
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

  it('trình duyệt tự phát (Chrome, Safari): gắn thẳng playlist 720p thay vì master (master bắt đầu ở 360p)', () => {
    const video = createFakeVideo({ canPlayNative: true });
    attachReelHlsSource(video, URL, { ...callbacks(), sources: RENDITIONS, loadLibrary: vi.fn() });
    expect(video.src).toBe(RENDITIONS[0]);
  });

  it('trình duyệt tự phát: mức đang thử lỗi thì lùi một mức, chưa báo lỗi khi còn nguồn', () => {
    const video = createFakeVideo({ canPlayNative: true });
    const handlers = callbacks();
    attachReelHlsSource(video, URL, { ...handlers, sources: RENDITIONS, loadLibrary: vi.fn() });

    video.emit('error');
    expect(video.src).toBe(RENDITIONS[1]);
    video.emit('error');
    expect(video.src).toBe(URL);
    expect(handlers.onAuthError).not.toHaveBeenCalled();
    expect(handlers.onFatalError).not.toHaveBeenCalled();
  });

  it('trình duyệt tự phát: hết nguồn mà vẫn lỗi (cookie CloudFront có thể hết hạn) thì xin cookie mới một lần, lỗi tiếp mới báo lỗi phát', () => {
    const video = createFakeVideo({ canPlayNative: true });
    const handlers = callbacks();
    attachReelHlsSource(video, URL, { ...handlers, sources: RENDITIONS, loadLibrary: vi.fn() });

    for (let i = 0; i < RENDITIONS.length; i++) video.emit('error');
    expect(handlers.onAuthError).toHaveBeenCalledTimes(1);
    expect(handlers.onFatalError).not.toHaveBeenCalled();

    video.emit('error');
    expect(handlers.onAuthError).toHaveBeenCalledTimes(1);
    expect(handlers.onFatalError).toHaveBeenCalledTimes(1);
  });

  it('trình duyệt tự phát: bấm phát mà quá 8 giây chưa có hình thì lùi một mức và phát tiếp', () => {
    vi.useFakeTimers();
    try {
      const slow = createFakeVideo({ canPlayNative: true });
      attachReelHlsSource(slow, URL, { ...callbacks(), sources: RENDITIONS, loadLibrary: vi.fn() });
      slow.paused = false;
      slow.emit('play');
      vi.advanceTimersByTime(REEL_RENDITION_TIMEOUT_MS);
      expect(slow.src).toBe(RENDITIONS[1]);
      expect(slow.play).toHaveBeenCalled();

      const fast = createFakeVideo({ canPlayNative: true });
      attachReelHlsSource(fast, URL, { ...callbacks(), sources: RENDITIONS, loadLibrary: vi.fn() });
      fast.emit('play');
      fast.emit('playing');
      vi.advanceTimersByTime(REEL_RENDITION_TIMEOUT_MS * 2);
      expect(fast.src).toBe(RENDITIONS[0]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('trình duyệt tự phát: đang phát mà đứng chờ tải quá 8 giây (mạng yếu) thì lùi một mức, phát tiếp đúng chỗ', () => {
    vi.useFakeTimers();
    try {
      const video = createFakeVideo({ canPlayNative: true });
      attachReelHlsSource(video, URL, { ...callbacks(), sources: RENDITIONS, loadLibrary: vi.fn() });
      video.paused = false;
      video.readyState = 4;
      video.emit('playing');
      video.currentTime = 4.2;
      video.readyState = 2;
      video.emit('waiting');
      vi.advanceTimersByTime(REEL_RENDITION_TIMEOUT_MS - 1);
      expect(video.src).toBe(RENDITIONS[0]);
      vi.advanceTimersByTime(1);
      expect(video.src).toBe(RENDITIONS[1]);
      video.currentTime = 0;
      video.emit('loadedmetadata');
      expect(video.currentTime).toBe(4.2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('trình duyệt tự phát: video tải sẵn ngoài màn hình (chưa bấm phát) không bị lùi mức dù tải chậm', () => {
    vi.useFakeTimers();
    try {
      const preloading = createFakeVideo({ canPlayNative: true });
      attachReelHlsSource(preloading, URL, { ...callbacks(), sources: RENDITIONS, loadLibrary: vi.fn() });
      vi.advanceTimersByTime(REEL_RENDITION_TIMEOUT_MS * 3);
      expect(preloading.src).toBe(RENDITIONS[0]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('trình duyệt tự phát: dọn thì gỡ nguồn (xoá bộ đệm), lỗi sau khi dọn không còn lùi mức hay báo lỗi', () => {
    const video = createFakeVideo({ canPlayNative: true });
    const handlers = callbacks();
    const release = attachReelHlsSource(video, URL, { ...handlers, sources: RENDITIONS, loadLibrary: vi.fn() });
    release();
    expect(video.removeAttribute).toHaveBeenCalledWith('src');
    expect(video.load).toHaveBeenCalled();
    video.emit('error');
    expect(video.src).toBe('');
    expect(handlers.onFatalError).not.toHaveBeenCalled();
  });

  it('Firefox máy tính: phát bằng hls.js, XHR gửi kèm cookie CloudFront', async () => {
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

  it('không có MSE: vẫn gắn src; thẻ <video> lỗi thì xin cookie mới một lần, lỗi tiếp mới báo lỗi phát', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary({ isSupported: false });
    const handlers = callbacks();
    attachReelHlsSource(video, URL, { ...handlers, loadLibrary: async () => fake.library });
    await flush();
    expect(video.src).toBe(URL);
    video.emit('error');
    expect(handlers.onAuthError).toHaveBeenCalledTimes(1);
    expect(handlers.onFatalError).not.toHaveBeenCalled();
    video.emit('error');
    expect(handlers.onFatalError).toHaveBeenCalledTimes(1);
  });

  it('chờ đọc xong master playlist rồi mới tải, segment đầu đã ở 720p', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary();
    attachReelHlsSource(video, URL, { ...callbacks(), loadLibrary: async () => fake.library });
    await flush();

    expect(fake.configs[0]!.autoStartLoad).toBe(false);
    expect(fake.player.startLoad).not.toHaveBeenCalled();
    fake.emitManifest([
      { width: 360, height: 640 },
      { width: 540, height: 960 },
      { width: 720, height: 1280 },
      { width: 1080, height: 1920 },
    ]);
    expect(fake.player.startLevel).toBe(2);
    expect(fake.player.startLoad).toHaveBeenCalledWith(-1);
  });

  it('bộ đệm: gắn với số giây theo vị trí, đổi được khi Reel thành bài đang xem', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const fake = createFakeLibrary();
    let control: ReelHlsBufferControl | undefined;
    attachReelHlsSource(video, URL, {
      ...callbacks(),
      bufferSeconds: 10,
      onBufferControl: (value) => {
        control = value;
      },
      loadLibrary: async () => fake.library,
    });
    await flush();

    expect(fake.player.config).toEqual({ maxBufferLength: 10, maxMaxBufferLength: 10 });
    control!.setBufferSeconds(30);
    expect(fake.player.config).toEqual({ maxBufferLength: 30, maxMaxBufferLength: 30 });
  });

  it('tải hls.js lỗi (mạng chập chờn) thì báo lỗi phát', async () => {
    const video = createFakeVideo({ canPlayNative: false });
    const handlers = callbacks();
    attachReelHlsSource(video, URL, { ...handlers, loadLibrary: () => Promise.reject(new Error('chunk')) });
    await flush();
    expect(handlers.onFatalError).toHaveBeenCalled();
  });
});

describe('pickReelStartLevel', () => {
  it('lấy mức nét nhất không quá 720p theo cạnh ngắn, video dọc hay ngang đều đúng', () => {
    expect(
      pickReelStartLevel([
        { width: 360, height: 640 },
        { width: 720, height: 1280 },
        { width: 1080, height: 1920 },
      ]),
    ).toBe(1);
    expect(
      pickReelStartLevel([
        { width: 1280, height: 720 },
        { width: 640, height: 360 },
      ]),
    ).toBe(0);
  });

  it('video chỉ có 360p, 540p thì bắt đầu ở 540p', () => {
    expect(
      pickReelStartLevel([
        { width: 360, height: 640 },
        { width: 540, height: 960 },
      ]),
    ).toBe(1);
  });

  it('mọi mức đều lớn hơn 720p thì lấy mức nhỏ nhất; playlist không ghi độ phân giải thì để hls.js tự chọn', () => {
    expect(
      pickReelStartLevel([
        { width: 1440, height: 2560 },
        { width: 1080, height: 1920 },
      ]),
    ).toBe(1);
    expect(pickReelStartLevel([{}, {}])).toBe(-1);
    expect(pickReelStartLevel([])).toBe(-1);
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
