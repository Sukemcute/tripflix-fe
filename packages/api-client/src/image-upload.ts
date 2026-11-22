import * as media from './generated/core-api/media/media';
import type { CreateUploadDtoMimeType } from './generated/core-api/model';
import { PresignedUploadError, uploadChunkToPresignedUrl } from './media-upload';

export type ImageMimeType = Extract<CreateUploadDtoMimeType, 'image/jpeg' | 'image/png' | 'image/webp'>;

export const IMAGE_MIME_TYPES: readonly ImageMimeType[] = ['image/jpeg', 'image/png', 'image/webp'];
/** Giống giới hạn của BE (MAX_IMAGE_FILE_SIZE_BYTES): ảnh tải lên đúng một phần. */
export const MAX_POST_IMAGE_BYTES = 10 * 1024 * 1024;
/** Giống MAX_VLOG_IMAGES của BE. */
export const MAX_POST_IMAGES = 10;

const MIME_BY_EXTENSION: Record<string, ImageMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Lấy loại ảnh server nhận từ mimeType của file, hoặc từ đuôi file. Không nhận (GIF, HEIC…) thì trả null. */
export function resolveImageMimeType(mimeType: string | null | undefined, fileName?: string | null): ImageMimeType | null {
  const normalized = mimeType?.toLowerCase();
  if (normalized && (IMAGE_MIME_TYPES as readonly string[]).includes(normalized)) return normalized as ImageMimeType;
  const extension = fileName?.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();
  return (extension && MIME_BY_EXTENSION[extension]) || null;
}

export interface ImageUploadSource {
  body: Blob | ArrayBuffer | Uint8Array<ArrayBuffer>;
  sizeBytes: number;
  mimeType: ImageMimeType;
  /** Kích thước đọc từ file, để giữ chỗ đúng tỉ lệ khi hiển thị. */
  widthPx?: number;
  heightPx?: number;
}

export interface ImageUploadOptions {
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
  /** Số lần thử PUT, tính cả lần đầu. */
  maxAttempts?: number;
  retryDelayMs?: (attempt: number) => number;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof PresignedUploadError)) return true;
  return error.status >= 500 || error.status === 408 || error.status === 429;
}

/**
 * Tải một ảnh của bài viết lên S3 qua API media: tạo lượt tải lên (một link PUT), PUT file, rồi hoàn tất.
 * Lỗi mạng thì thử lại; link hết hạn (403) thì xin link mới. Ảnh dùng được ngay khi hàm trả về
 * (không chuyển mã); trả assetId để gắn vào bài (`media_ids`).
 */
export async function uploadImage(source: ImageUploadSource, options: ImageUploadOptions = {}): Promise<string> {
  const { onProgress, signal, maxAttempts = 3, retryDelayMs = (attempt) => 1000 * 2 ** (attempt - 1) } = options;
  const created = (
    await media.mediaUploadControllerCreateUpload(
      {
        mimeType: source.mimeType,
        fileSizeBytes: source.sizeBytes,
        ...(source.widthPx ? { widthPx: source.widthPx } : {}),
        ...(source.heightPx ? { heightPx: source.heightPx } : {}),
      },
      { signal },
    )
  ).data;
  if (!('assetId' in created) || !created.parts[0]) throw new Error('Không tạo được lượt tải ảnh lên');
  const { assetId } = created;
  let url = created.parts[0].url;
  onProgress?.(0, source.sizeBytes);

  let etag = '';
  for (let attempt = 1; ; attempt += 1) {
    signal?.throwIfAborted();
    try {
      ({ etag } = await uploadChunkToPresignedUrl(
        url,
        source.body,
        signal,
        onProgress && ((sent) => onProgress(Math.min(sent, source.sizeBytes), source.sizeBytes)),
      ));
      if (!etag) throw new Error('S3 không trả ETag cho ảnh');
      break;
    } catch (error) {
      if (signal?.aborted || attempt >= maxAttempts) throw error;
      if (error instanceof PresignedUploadError && error.status === 403) {
        const resigned = (await media.mediaUploadControllerResignParts(assetId, { partNumbers: [1] }, { signal })).data;
        const nextUrl = 'parts' in resigned ? resigned.parts.find((part) => part.partNumber === 1)?.url : undefined;
        if (!nextUrl) throw error;
        url = nextUrl;
      } else if (!isRetryable(error)) {
        throw error;
      } else {
        await wait(retryDelayMs(attempt), signal);
      }
    }
  }

  onProgress?.(source.sizeBytes, source.sizeBytes);
  await media.mediaUploadControllerCompleteUpload(assetId, { parts: [{ partNumber: 1, etag }] }, { signal });
  return assetId;
}
