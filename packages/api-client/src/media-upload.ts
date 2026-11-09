/**
 * Tải một phần dữ liệu (chunk) lên presigned URL (S3 / MinIO) bằng HTTP PUT.
 * Trích xuất ETag từ header trả về phục vụ hoàn tất multipart upload.
 */
export async function uploadChunkToPresignedUrl(
  url: string,
  chunk: Blob | ArrayBuffer,
): Promise<{ etag: string }> {
  const res = await fetch(url, {
    method: 'PUT',
    body: chunk,
  });

  if (!res.ok) {
    throw new Error(`Tải lên phần dữ liệu thất bại (HTTP ${res.status})`);
  }

  let etag = res.headers.get('ETag') || res.headers.get('etag') || '';
  if (etag && !etag.startsWith('"')) {
    etag = `"${etag}"`;
  }

  return { etag };
}
