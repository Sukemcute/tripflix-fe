import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserNotificationAudio } from './browser-notification-audio';

function browser() {
  vi.stubGlobal('location', { origin: 'http://localhost' });
  const nodes: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    buffer: unknown;
  }[] = [];
  const volume = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    state: 'suspended',
    destination: {},
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
    close: vi.fn(async () => {
      context.state = 'closed';
    }),
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 0.89 }),
    createGain: vi.fn(() => volume),
    createBufferSource: vi.fn(() => {
      const node = {
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
        buffer: null as unknown,
      };
      nodes.push(node);
      return node;
    }),
  };
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return context;
      }
    },
  );
  const fetchAudio = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  vi.stubGlobal('fetch', fetchAudio);
  return { context, nodes, volume, fetchAudio };
}

describe('notification Web Audio activation', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('chưa có thao tác kích hoạt thì không giả vờ đã phát thành công', async () => {
    const app = browser();
    const audio = createBrowserNotificationAudio('/audio/voice.wav');
    await expect(audio.play()).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(app.nodes).toHaveLength(0);
  });
  it('resume ngay trong thao tác người dùng rồi tái sử dụng cho thông báo đến bất đồng bộ', async () => {
    const app = browser();
    let receive!: (value: unknown) => void;
    app.fetchAudio.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          receive = resolve;
        }),
    );
    const audio = createBrowserNotificationAudio('/audio/voice.wav');
    const ready = audio.unlock!();
    expect(app.context.resume).toHaveBeenCalledTimes(1);
    receive({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    expect(await ready).toBe(true);
    await Promise.resolve();
    await audio.play();
    expect(app.nodes[0]?.start).toHaveBeenCalledTimes(1);
    audio.pause();
    await audio.play();
    expect(app.nodes[1]?.start).toHaveBeenCalledTimes(1);
    expect(app.fetchAudio).toHaveBeenCalledTimes(1);
    expect(app.volume.gain.value).toBe(0.65);
    audio.dispose!();
  });
  it('đăng xuất/tắt tiếng trong khi đợi decode không phát muộn sau đó', async () => {
    const app = browser();
    const audio = createBrowserNotificationAudio('/audio/voice.wav');
    await audio.unlock!();
    const pending = audio.play();
    audio.pause();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(app.nodes).toHaveLength(0);
    audio.dispose!();
  });
  it('file lỗi có thể tải lại; dispose đóng context và dừng tiếng', async () => {
    const app = browser();
    const audio = createBrowserNotificationAudio('/audio/voice.wav');
    app.fetchAudio.mockResolvedValueOnce({ ok: false });
    await expect(audio.unlock!()).rejects.toThrow('unavailable');
    expect(await audio.unlock!()).toBe(true);
    await audio.play();
    audio.dispose!();
    expect(app.nodes[0]?.stop).toHaveBeenCalled();
    expect(app.context.close).toHaveBeenCalledTimes(1);
  });
});
