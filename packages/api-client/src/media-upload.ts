/** S3 từ chối một phần; `status` 403 thường là link ký sẵn đã hết hạn. */
export class PresignedUploadError extends Error {
  constructor(readonly status: number) {
    super(`Tải lên phần dữ liệu thất bại (HTTP ${status})`);
    this.name = 'PresignedUploadError';
  }
}

/**
 * Tải một phần dữ liệu (chunk) lên presigned URL (S3 / MinIO) bằng HTTP PUT.
 * Trích xuất ETag từ header trả về phục vụ hoàn tất multipart upload.
 */
export async function uploadChunkToPresignedUrl(
  url: string,
  chunk: Blob | ArrayBuffer | Uint8Array<ArrayBuffer>,
  signal?: AbortSignal,
): Promise<{ etag: string }> {
  const res = await fetch(
    url,
    signal ? { method: 'PUT', body: chunk, signal } : { method: 'PUT', body: chunk },
  );

  if (!res.ok) {
    throw new PresignedUploadError(res.status);
  }

  let etag = res.headers.get('ETag') || res.headers.get('etag') || '';
  if (etag && !etag.startsWith('"')) {
    etag = `"${etag}"`;
  }

  return { etag };
}
