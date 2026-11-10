import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadChunkToPresignedUrl } from './media-upload';

describe('uploadChunkToPresignedUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gửi PUT request với body chunk và trích xuất ETag thành công', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { ETag: '"test-etag-123"' },
      }),
    );

    const blob = new Blob(['sample data'], { type: 'text/plain' });
    const result = await uploadChunkToPresignedUrl('https://s3.example.com/part1', blob);

    expect(fetchMock).toHaveBeenCalledWith('https://s3.example.com/part1', {
      method: 'PUT',
      body: blob,
    });
    expect(result.etag).toBe('"test-etag-123"');
  });

  it('tự động bọc ngoặc kép nếu ETag không có ngoặc kép', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { ETag: 'raw-etag-456' },
      }),
    );

    const blob = new Blob(['data']);
    const result = await uploadChunkToPresignedUrl('https://s3.example.com/part2', blob);
    expect(result.etag).toBe('"raw-etag-456"');
  });

  it('ném lỗi khi response status không ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Forbidden', {
        status: 403,
      }),
    );

    const blob = new Blob(['data']);
    await expect(uploadChunkToPresignedUrl('https://s3.example.com/part3', blob)).rejects.toThrow(
      'HTTP 403',
    );
  });
});
