import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWebAudioAsset } from './public-audio';

describe('public notification audio asset', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('tải file cùng origin, giữ phiên bản cache và không mang thông tin đăng nhập', async () => {
    vi.stubGlobal('location', { origin: 'https://tripflix.test' });
    const buffer = new ArrayBuffer(8);
    const fetchAsset = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => buffer });
    vi.stubGlobal('fetch', fetchAsset);
    expect(await loadWebAudioAsset('/audio/tripi.wav?v=selected')).toBe(buffer);
    expect(fetchAsset).toHaveBeenCalledWith(
      'https://tripflix.test/audio/tripi.wav?v=selected',
      expect.objectContaining({ credentials: 'omit', redirect: 'error' }),
    );
  });
  it.each([
    'https://evil.test/x.wav',
    '//evil.test/x.wav',
    '/audio/../api/auth/me',
    '/audio/../../private.wav',
    '/audio/\\evil.test/x.wav',
  ])('không fetch đường dẫn ngoài thư mục âm báo: %s', async (path) => {
    vi.stubGlobal('location', { origin: 'https://tripflix.test' });
    const fetchAsset = vi.fn();
    vi.stubGlobal('fetch', fetchAsset);
    await expect(loadWebAudioAsset(path)).rejects.toThrow('Invalid audio asset');
    expect(fetchAsset).not.toHaveBeenCalled();
  });
  it('HTTP lỗi không đưa dữ liệu lỗi sang bộ giải mã', async () => {
    vi.stubGlobal('location', { origin: 'https://tripflix.test' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(loadWebAudioAsset('/audio/tripi.wav')).rejects.toThrow('unavailable');
  });
});
