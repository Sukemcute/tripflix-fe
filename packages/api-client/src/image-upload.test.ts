import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { resolveImageMimeType, uploadImage } from './image-upload';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const s3 = (status: number, etag?: string) => new Response(null, { status, headers: etag ? { ETag: etag } : {} });

type Route = (url: string, init?: RequestInit) => Response | undefined;
function mockFetch(...routes: Route[]) {
  const queue = [...routes];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const route = queue.shift();
    const response = route?.(String(input), init);
    if (!response) throw new Error(`Unexpected request ${init?.method ?? 'GET'} ${String(input)}`);
    return response;
  });
}
const expectRequest =
  (method: string, url: string, response: () => Response): Route =>
  (actualUrl, init) => {
    expect(`${init?.method} ${actualUrl}`).toBe(`${method} ${url}`);
    return response();
  };

const created = {
  assetId: 'image-1',
  partSizeBytes: 10_485_760,
  expiresAt: '2026-11-13T10:00:00.000Z',
  parts: [{ partNumber: 1, url: 'https://s3/image-part-1' }],
};
const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

beforeEach(() => configureHttp({ baseUrl: 'http://api' }));
afterEach(() => vi.restoreAllMocks());

describe('uploadImage', () => {
  it('khai loại và kích thước ảnh (không có thời lượng), PUT một phần rồi hoàn tất với ETag', async () => {
    const fetchMock = mockFetch(
      expectRequest('POST', 'http://api/api/media/uploads', () => json(201, created)),
      expectRequest('PUT', 'https://s3/image-part-1', () => s3(200, '"etag-1"')),
      expectRequest('POST', 'http://api/api/media/uploads/image-1/complete', () =>
        json(202, { assetId: 'image-1', status: 'ready' }),
      ),
    );
    const progress: number[] = [];

    const assetId = await uploadImage(
      { body, sizeBytes: 4, mimeType: 'image/jpeg', widthPx: 1080, heightPx: 1350 },
      { onProgress: (uploaded) => progress.push(uploaded) },
    );

    expect(assetId).toBe('image-1');
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      mimeType: 'image/jpeg',
      fileSizeBytes: 4,
      widthPx: 1080,
      heightPx: 1350,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]![1]?.body))).toEqual({ parts: [{ partNumber: 1, etag: '"etag-1"' }] });
    expect(progress.at(0)).toBe(0);
    expect(progress.at(-1)).toBe(4);
  });

  it('link hết hạn (403) thì xin link mới rồi PUT lại', async () => {
    mockFetch(
      expectRequest('POST', 'http://api/api/media/uploads', () => json(201, created)),
      expectRequest('PUT', 'https://s3/image-part-1', () => s3(403)),
      expectRequest('POST', 'http://api/api/media/uploads/image-1/parts', () =>
        json(200, { parts: [{ partNumber: 1, url: 'https://s3/image-part-1-new' }], expiresAt: created.expiresAt }),
      ),
      expectRequest('PUT', 'https://s3/image-part-1-new', () => s3(200, '"etag-2"')),
      expectRequest('POST', 'http://api/api/media/uploads/image-1/complete', () =>
        json(202, { assetId: 'image-1', status: 'ready' }),
      ),
    );

    await expect(uploadImage({ body, sizeBytes: 4, mimeType: 'image/jpeg' })).resolves.toBe('image-1');
  });

  it('S3 từ chối hẳn (400) thì dừng, không hoàn tất', async () => {
    const fetchMock = mockFetch(
      expectRequest('POST', 'http://api/api/media/uploads', () => json(201, created)),
      expectRequest('PUT', 'https://s3/image-part-1', () => s3(400)),
    );

    await expect(uploadImage({ body, sizeBytes: 4, mimeType: 'image/png' })).rejects.toThrow('HTTP 400');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('resolveImageMimeType', () => {
  it('nhận JPEG, PNG, WebP theo mimeType hoặc đuôi file; GIF, HEIC thì không', () => {
    expect(resolveImageMimeType('IMAGE/JPEG')).toBe('image/jpeg');
    expect(resolveImageMimeType('', 'anh.webp')).toBe('image/webp');
    expect(resolveImageMimeType(undefined, 'IMG_01.JPG?x=1')).toBe('image/jpeg');
    expect(resolveImageMimeType('image/gif', 'a.gif')).toBeNull();
    expect(resolveImageMimeType('image/heic', 'a.heic')).toBeNull();
  });
});
