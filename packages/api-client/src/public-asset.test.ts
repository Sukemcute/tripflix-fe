import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import { readPublicAsset } from './public-asset';

afterEach(() => {
  configureHttp({ baseUrl: '' });
  vi.unstubAllGlobals();
});

describe('public assets', () => {
  it('reads the original asset URL without API credentials or authentication headers', async () => {
    const getAccessToken = vi.fn(() => 'private-token');
    configureHttp({ baseUrl: 'https://api.example.com', getAccessToken });
    const blob = new Blob(['font'], { type: 'font/ttf' });
    const request = vi.fn(async () => new Response(blob));
    vi.stubGlobal('fetch', request);
    expect(await (await readPublicAsset('/brand/regular.ttf')).text()).toBe('font');
    expect(request).toHaveBeenCalledWith('/brand/regular.ttf', { credentials: 'omit', cache: 'force-cache' });
    expect(getAccessToken).not.toHaveBeenCalled();
  });
  it('rejects a missing asset instead of passing an error page to the renderer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    await expect(readPublicAsset('/missing.png')).rejects.toBeInstanceOf(HttpError);
  });
});
