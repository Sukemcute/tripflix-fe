import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { resolveVideoMimeType, uploadVideo, type VideoUploadSource } from './video-upload';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const s3 = (status: number, etag?: string) =>
  new Response(null, { status, headers: etag ? { ETag: etag } : {} });

/** File 25 byte, mỗi phần 10 byte: 3 phần 10, 10, 5 byte. */
function makeSource(): VideoUploadSource & { reads: [number, number][] } {
  const bytes = new Uint8Array(25).map((_, index) => index);
  const reads: [number, number][] = [];
  return {
    reads,
    sizeBytes: 25,
    durationSec: 12.5,
    mimeType: 'video/mp4',
    readRange: async (start, end) => {
      reads.push([start, end]);
      return bytes.slice(start, end);
    },
  };
}
const created = {
  assetId: 'asset-1',
  partSizeBytes: 10,
  expiresAt: '2026-11-10T10:00:00.000Z',
  parts: [1, 2, 3].map((partNumber) => ({ partNumber, url: `https://s3/part-${partNumber}` })),
};

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

beforeEach(() => configureHttp({ baseUrl: 'http://api' }));
afterEach(() => vi.restoreAllMocks());

describe('uploadVideo', () => {
  it('tạo lượt tải lên, PUT đủ từng phần theo đúng đoạn byte rồi hoàn tất với ETag của S3', async () => {
    const fetchMock = mockFetch(
      expectRequest('POST', 'http://api/api/media/uploads', () => json(201, created)),
      expectRequest('PUT', 'https://s3/part-1', () => s3(200, '"e1"')),
      expectRequest('PUT', 'https://s3/part-2', () => s3(200, '"e2"')),
      expectRequest('PUT', 'https://s3/part-3', () => s3(200, 'e3')),
      expectRequest('POST', 'http://api/api/media/uploads/asset-1/complete', () =>
        json(202, { assetId: 'asset-1', status: 'processing' }),
      ),
    );
    const source = makeSource();
    const progress: number[] = [];

    await expect(uploadVideo(source, { onProgress: (done) => progress.push(done) })).resolves.toBe('asset-1');

    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      mimeType: 'video/mp4',
      fileSizeBytes: 25,
      durationSec: 12.5,
    });
    expect(source.reads).toEqual([
      [0, 10],
      [10, 20],
      [20, 25],
    ]);
    expect((fetchMock.mock.calls[3]![1]!.body as Uint8Array).length).toBe(5);
    expect(JSON.parse(String(fetchMock.mock.calls[4]![1]!.body))).toEqual({
      parts: [
        { partNumber: 1, etag: '"e1"' },
        { partNumber: 2, etag: '"e2"' },
        { partNumber: 3, etag: '"e3"' },
      ],
    });
    expect(progress).toEqual([0, 10, 20, 25]);
  });

  it('xin link mới khi S3 trả 403 vì link hết hạn, rồi tải lại phần đó', async () => {
    const fetchMock = mockFetch(
      () => json(201, { ...created, parts: created.parts.slice(0, 1), partSizeBytes: 25 }),
      expectRequest('PUT', 'https://s3/part-1', () => s3(403)),
      expectRequest('POST', 'http://api/api/media/uploads/asset-1/parts', () =>
        json(200, { parts: [{ partNumber: 1, url: 'https://s3/part-1-new' }], expiresAt: created.expiresAt }),
      ),
      expectRequest('PUT', 'https://s3/part-1-new', () => s3(200, '"e1"')),
      () => json(202, { assetId: 'asset-1', status: 'processing' }),
    );

    await expect(uploadVideo(makeSource())).resolves.toBe('asset-1');
    expect(JSON.parse(String(fetchMock.mock.calls[2]![1]!.body))).toEqual({ partNumbers: [1] });
  });

  it('thử lại phần lỗi mạng sau khi chờ, không đọc lại file', async () => {
    const delays: number[] = [];
    const source = makeSource();
    mockFetch(
      () => json(201, { ...created, parts: created.parts.slice(0, 1), partSizeBytes: 25 }),
      () => {
        throw new TypeError('Network request failed');
      },
      () => s3(503),
      () => s3(200, '"e1"'),
      () => json(202, { assetId: 'asset-1', status: 'processing' }),
    );

    await expect(
      uploadVideo(source, {
        retryDelayMs: (attempt) => {
          delays.push(attempt);
          return 0;
        },
      }),
    ).resolves.toBe('asset-1');
    expect(delays).toEqual([1, 2]);
    expect(source.reads).toHaveLength(1);
  });

  it('dừng sau số lần thử tối đa và không gọi hoàn tất', async () => {
    const fetchMock = mockFetch(
      () => json(201, { ...created, parts: created.parts.slice(0, 1), partSizeBytes: 25 }),
      () => s3(500),
      () => s3(500),
    );

    await expect(uploadVideo(makeSource(), { maxAttempts: 2, retryDelayMs: () => 0 })).rejects.toThrow(
      'HTTP 500',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('không thử lại lỗi 4xx khác 403 của S3', async () => {
    const fetchMock = mockFetch(
      () => json(201, { ...created, parts: created.parts.slice(0, 1), partSizeBytes: 25 }),
      () => s3(400),
    );

    await expect(uploadVideo(makeSource(), { retryDelayMs: () => 0 })).rejects.toThrow('HTTP 400');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('dừng ngay khi người dùng huỷ', async () => {
    const controller = new AbortController();
    mockFetch(
      () => json(201, created),
      () => {
        controller.abort(new Error('huỷ'));
        return s3(200, '"e1"');
      },
    );

    await expect(uploadVideo(makeSource(), { signal: controller.signal })).rejects.toThrow('huỷ');
  });
});

describe('resolveVideoMimeType', () => {
  it.each([
    ['video/mp4', null, 'video/mp4'],
    ['VIDEO/QUICKTIME', null, 'video/quicktime'],
    [null, 'file:///cache/IMG_0001.MOV', 'video/quicktime'],
    [undefined, 'clip.m4v?token=1', 'video/mp4'],
    ['video/webm', 'clip.webm', null],
    [null, null, null],
  ])('%s, %s → %s', (mimeType, fileName, expected) => {
    expect(resolveVideoMimeType(mimeType, fileName)).toBe(expected);
  });
});
