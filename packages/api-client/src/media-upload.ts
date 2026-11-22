/** S3 từ chối một phần; `status` 403 thường là link ký sẵn đã hết hạn. */
export class PresignedUploadError extends Error {
  constructor(readonly status: number) {
    super(`Tải lên phần dữ liệu thất bại (HTTP ${status})`);
    this.name = 'PresignedUploadError';
  }
}

type ChunkBody = Blob | ArrayBuffer | Uint8Array<ArrayBuffer>;

function quoteEtag(etag: string | null): string {
  if (!etag) return '';
  return etag.startsWith('"') ? etag : `"${etag}"`;
}

/**
 * Tải một phần dữ liệu (chunk) lên presigned URL (S3 / MinIO) bằng HTTP PUT.
 * Trích xuất ETag từ header trả về phục vụ hoàn tất multipart upload.
 * Có `onProgress` thì dùng XMLHttpRequest để báo số byte đã gửi trong lúc tải (fetch không báo được);
 * môi trường không có XMLHttpRequest thì dùng fetch và không báo giữa chừng.
 */
export async function uploadChunkToPresignedUrl(
  url: string,
  chunk: ChunkBody,
  signal?: AbortSignal,
  onProgress?: (sentBytes: number) => void,
): Promise<{ etag: string }> {
  if (onProgress && typeof XMLHttpRequest !== 'undefined') {
    return uploadWithXhr(url, chunk, onProgress, signal);
  }
  const res = await fetch(
    url,
    signal ? { method: 'PUT', body: chunk, signal } : { method: 'PUT', body: chunk },
  );

  if (!res.ok) {
    throw new PresignedUploadError(res.status);
  }

  return { etag: quoteEtag(res.headers.get('ETag') || res.headers.get('etag')) };
}

function uploadWithXhr(
  url: string,
  chunk: ChunkBody,
  onProgress: (sentBytes: number) => void,
  signal?: AbortSignal,
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    const done = () => signal?.removeEventListener('abort', onAbort);
    xhr.open('PUT', url);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      done();
      if (xhr.status < 200 || xhr.status >= 300) return reject(new PresignedUploadError(xhr.status));
      resolve({ etag: quoteEtag(xhr.getResponseHeader('ETag')) });
    };
    // Giống fetch: lỗi mạng là TypeError để nơi gọi thử lại như cũ.
    xhr.onerror = () => {
      done();
      reject(new TypeError('Network request failed'));
    };
    xhr.ontimeout = xhr.onerror;
    xhr.onabort = () => {
      done();
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    xhr.send(chunk);
  });
}
