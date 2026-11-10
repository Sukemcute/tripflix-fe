import * as media from './generated/core-api/media/media';
import type { CreateUploadDtoMimeType, SignedPartDto, UploadedPartDto } from './generated/core-api/model';
import { PresignedUploadError, uploadChunkToPresignedUrl } from './media-upload';

export type VideoMimeType = CreateUploadDtoMimeType;

export interface VideoUploadSource {
  sizeBytes: number;
  durationSec: number;
  mimeType: VideoMimeType;
  /** Đọc byte [start, end) của file. Mobile đọc từng đoạn từ đĩa, web cắt Blob. */
  readRange(start: number, end: number): Promise<Blob | ArrayBuffer | Uint8Array<ArrayBuffer>>;
}

export interface VideoUploadOptions {
  /** Gọi sau mỗi phần tải xong, với số byte đã tải và tổng số byte. */
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
  /** Số lần thử mỗi phần, tính cả lần đầu. */
  maxAttempts?: number;
  /** Chờ trước lần thử lại thứ n (bắt đầu từ 1). Mặc định 1 giây, 2 giây, 4 giây... */
  retryDelayMs?: (attempt: number) => number;
}

const MIME_BY_EXTENSION: Record<string, VideoMimeType> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
};

/** Lấy loại video server nhận từ mimeType của thư viện chọn file, hoặc từ đuôi file. Không nhận thì trả null. */
export function resolveVideoMimeType(
  mimeType: string | null | undefined,
  fileName?: string | null,
): VideoMimeType | null {
  const normalized = mimeType?.toLowerCase();
  if (normalized === 'video/mp4' || normalized === 'video/quicktime') return normalized;
  const extension = fileName?.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();
  return (extension && MIME_BY_EXTENSION[extension]) || null;
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

/**
 * Tải một video lên S3 qua API media: tạo lượt tải lên, PUT từng phần vào link ký sẵn, rồi hoàn tất.
 * Lỗi mạng thì thử lại phần đó; S3 trả 403 (link hết hạn) thì xin link mới cho phần đó rồi thử lại.
 * Trả assetId để gắn vào bài đăng (`media_ids`). Video còn phải chờ chuyển mã sau khi hàm trả về.
 */
export async function uploadVideo(
  source: VideoUploadSource,
  options: VideoUploadOptions = {},
): Promise<string> {
  const {
    onProgress,
    signal,
    maxAttempts = 3,
    retryDelayMs = (attempt) => 1000 * 2 ** (attempt - 1),
  } = options;
  const created = (
    await media.mediaUploadControllerCreateUpload(
      { mimeType: source.mimeType, fileSizeBytes: source.sizeBytes, durationSec: source.durationSec },
      { signal },
    )
  ).data;
  if (!('assetId' in created)) throw new Error('Không tạo được lượt tải lên');
  const { assetId, partSizeBytes } = created;
  const urls = new Map(created.parts.map((part: SignedPartDto) => [part.partNumber, part.url]));
  const uploaded: UploadedPartDto[] = [];
  let uploadedBytes = 0;
  onProgress?.(0, source.sizeBytes);

  for (const partNumber of [...urls.keys()].sort((a, b) => a - b)) {
    const start = (partNumber - 1) * partSizeBytes;
    const end = Math.min(start + partSizeBytes, source.sizeBytes);
    const chunk = await source.readRange(start, end);
    for (let attempt = 1; ; attempt += 1) {
      signal?.throwIfAborted();
      try {
        const { etag } = await uploadChunkToPresignedUrl(urls.get(partNumber)!, chunk, signal);
        if (!etag) throw new Error(`S3 không trả ETag cho phần ${partNumber}`);
        uploaded.push({ partNumber, etag });
        break;
      } catch (error) {
        if (signal?.aborted || attempt >= maxAttempts) throw error;
        if (error instanceof PresignedUploadError && error.status === 403) {
          const resigned = (
            await media.mediaUploadControllerResignParts(assetId, { partNumbers: [partNumber] }, { signal })
          ).data;
          const url =
            'parts' in resigned
              ? resigned.parts.find((part) => part.partNumber === partNumber)?.url
              : undefined;
          if (!url) throw error;
          urls.set(partNumber, url);
        } else if (
          error instanceof PresignedUploadError &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 429
        ) {
          throw error;
        } else {
          await wait(retryDelayMs(attempt), signal);
        }
      }
    }
    uploadedBytes += end - start;
    onProgress?.(uploadedBytes, source.sizeBytes);
  }

  await media.mediaUploadControllerCompleteUpload(assetId, { parts: uploaded }, { signal });
  return assetId;
}
