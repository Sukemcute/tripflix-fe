import { resolveVideoMimeType, type VideoUploadSource } from '@tripflix/api-client';
import { File, FileMode } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export interface PickedVideo extends VideoUploadSource {
  uri: string;
  durationMs: number;
  /** Kích thước hiển thị; 0 nếu thư viện chọn file không báo. */
  width: number;
  height: number;
}

export type PickedVideoError = 'unsupportedVideo' | 'unknownDuration' | 'invalidMedia';

/** Đổi video vừa chọn thành nguồn tải lên: đọc từng đoạn từ đĩa, không nạp cả file vào bộ nhớ. */
export async function toPickedVideo(asset: ImagePickerAsset): Promise<PickedVideo | PickedVideoError> {
  const mimeType = resolveVideoMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!mimeType) return 'unsupportedVideo';
  // expo-image-picker 58 trên web trả thời lượng bằng giây, trên điện thoại bằng mili giây.
  const durationMs = asset.duration == null ? 0 : asset.duration * (Platform.OS === 'web' ? 1000 : 1);
  if (!(durationMs > 0)) return 'unknownDuration';

  if (Platform.OS === 'web') {
    // Trên web thư viện chọn file trả kèm đối tượng File của trình duyệt.
    const blob = asset.file;
    if (!blob?.size) return 'invalidMedia';
    return {
      uri: asset.uri,
      durationMs,
      durationSec: durationMs / 1000,
      width: asset.width,
      height: asset.height,
      mimeType,
      sizeBytes: blob.size,
      readRange: async (start, end) => blob.slice(start, end),
    };
  }

  return (
    fileVideoSource({
      uri: asset.uri,
      durationMs,
      width: asset.width,
      height: asset.height,
      mimeType,
      sizeBytes: asset.fileSize,
    }) ?? 'invalidMedia'
  );
}

/** Nguồn tải lên đọc từng đoạn từ một file trên điện thoại. File rỗng hoặc không đọc được thì trả null. */
export function fileVideoSource(
  video: Omit<PickedVideo, 'durationSec' | 'readRange' | 'sizeBytes'> & { sizeBytes?: number },
): PickedVideo | null {
  const file = new File(video.uri);
  const sizeBytes = video.sizeBytes || file.size;
  if (!sizeBytes) return null;
  return {
    ...video,
    durationSec: video.durationMs / 1000,
    sizeBytes,
    readRange: async (start, end) => {
      const handle = file.open(FileMode.ReadOnly);
      try {
        handle.offset = start;
        return await handle.readBytes(end - start);
      } finally {
        handle.close();
      }
    },
  };
}
