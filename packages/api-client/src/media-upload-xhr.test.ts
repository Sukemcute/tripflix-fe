import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import { PresignedUploadError, uploadChunkToPresignedUrl } from './media-upload';
import { uploadVideo } from './video-upload';

type Step =
  { kind: 'progress'; loaded: number } | { kind: 'load'; status: number; etag?: string } | { kind: 'error' };

/** XMLHttpRequest giả: chạy lần lượt các bước khi `send` được gọi. */
function stubXhr(...requests: Step[][]) {
  const sent: { method: string; url: string; body: unknown }[] = [];
  const queue = [...requests];
  class FakeXhr {
    status = 0;
    upload: { onprogress: ((event: { loaded: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    onabort: (() => void) | null = null;
    private method = '';
    private url = '';
    private etag: string | null = null;
    private aborted = false;
    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    getResponseHeader(name: string) {
      return name.toLowerCase() === 'etag' ? this.etag : null;
    }
    abort() {
      this.aborted = true;
      this.onabort?.();
    }
    send(body: unknown) {
      sent.push({ method: this.method, url: this.url, body });
      const steps = queue.shift() ?? [];
      void (async () => {
        for (const step of steps) {
          await Promise.resolve();
          if (this.aborted) return;
          if (step.kind === 'progress') this.upload.onprogress?.({ loaded: step.loaded });
          else if (step.kind === 'error') this.onerror?.();
          else {
            this.status = step.status;
            this.etag = step.etag ?? null;
            this.onload?.();
          }
        }
      })();
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  return sent;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('uploadChunkToPresignedUrl với onProgress', () => {
  it('PUT bằng XMLHttpRequest, báo số byte đã gửi và trả ETag có ngoặc kép', async () => {
    const sent = stubXhr([
      { kind: 'progress', loaded: 4 },
      { kind: 'progress', loaded: 10 },
      { kind: 'load', status: 200, etag: 'abc' },
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const chunk = new Uint8Array(10);
    const progress: number[] = [];

    await expect(
      uploadChunkToPresignedUrl('https://s3/part-1', chunk, undefined, (bytes) => progress.push(bytes)),
    ).resolves.toEqual({ etag: '"abc"' });
    expect(sent).toEqual([{ method: 'PUT', url: 'https://s3/part-1', body: chunk }]);
    expect(progress).toEqual([4, 10]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('S3 trả lỗi thì ném PresignedUploadError kèm mã HTTP', async () => {
    stubXhr([{ kind: 'load', status: 403 }]);
    const error = await uploadChunkToPresignedUrl(
      'https://s3/p',
      new Uint8Array(1),
      undefined,
      () => {},
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PresignedUploadError);
    expect((error as PresignedUploadError).status).toBe(403);
  });

  it('lỗi mạng thì ném TypeError giống fetch', async () => {
    stubXhr([{ kind: 'error' }]);
    await expect(
      uploadChunkToPresignedUrl('https://s3/p', new Uint8Array(1), undefined, () => {}),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it('huỷ giữa chừng thì dừng và ném lý do huỷ', async () => {
    stubXhr([
      { kind: 'progress', loaded: 1 },
      { kind: 'progress', loaded: 2 },
      { kind: 'load', status: 200 },
    ]);
    const controller = new AbortController();
    const reason = new Error('huỷ');
    const promise = uploadChunkToPresignedUrl('https://s3/p', new Uint8Array(2), controller.signal, () =>
      controller.abort(reason),
    );
    await expect(promise).rejects.toBe(reason);
  });

  it('không có onProgress thì vẫn dùng fetch như cũ', async () => {
    const sent = stubXhr();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200, headers: { ETag: '"e"' } }),
    );
    await expect(uploadChunkToPresignedUrl('https://s3/p', new Uint8Array(1))).resolves.toEqual({
      etag: '"e"',
    });
    expect(sent).toEqual([]);
  });
});

describe('uploadVideo báo tiến độ trong từng phần', () => {
  it('cộng dồn byte đang gửi của phần hiện tại, thử lại phần lỗi mà thanh tiến độ không lùi', async () => {
    configureHttp({ baseUrl: 'http://api' });
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        json(201, {
          assetId: 'asset-1',
          partSizeBytes: 10,
          expiresAt: '2026-11-12T10:00:00.000Z',
          parts: [1, 2].map((partNumber) => ({ partNumber, url: `https://s3/part-${partNumber}` })),
        }),
      )
      .mockResolvedValueOnce(json(202, { assetId: 'asset-1', status: 'processing' }));
    const sent = stubXhr(
      [
        { kind: 'progress', loaded: 6 },
        { kind: 'load', status: 200, etag: 'e1' },
      ],
      [{ kind: 'progress', loaded: 3 }, { kind: 'error' }],
      [
        { kind: 'progress', loaded: 2 },
        { kind: 'progress', loaded: 5 },
        { kind: 'load', status: 200, etag: 'e2' },
      ],
    );
    const progress: number[] = [];

    await expect(
      uploadVideo(
        {
          sizeBytes: 15,
          durationSec: 3,
          mimeType: 'video/mp4',
          readRange: async (start, end) => new Uint8Array(end - start),
        },
        { onProgress: (done) => progress.push(done), retryDelayMs: () => 0 },
      ),
    ).resolves.toBe('asset-1');
    expect(sent.map((request) => request.url)).toEqual([
      'https://s3/part-1',
      'https://s3/part-2',
      'https://s3/part-2',
    ]);
    expect(progress).toEqual([0, 6, 10, 13, 15]);
  });
});
