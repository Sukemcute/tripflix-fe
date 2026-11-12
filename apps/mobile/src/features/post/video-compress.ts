import { shouldCompressVideo, VIDEO_COMPRESSION } from '@tripflix/app-core';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { Video } from 'react-native-compressor';
import { fileVideoSource, type PickedVideo } from './video-source';

export interface VideoCompression {
  /** Có nén thật không. Không nén thì `result` trả ngay video gốc. */
  compressing: boolean;
  /** Luôn thành công: nén lỗi hoặc file nén không nhỏ hơn thì trả video gốc. */
  result: Promise<PickedVideo>;
  /** Huỷ nén đang chạy và xoá file tạm (gọi khi bỏ video, đổi video, rời màn, hoặc tải lên xong). */
  dispose(): void;
}

/**
 * Nén video về tối đa 1080p H.264 bằng bộ mã hoá phần cứng của điện thoại, để tải lên nhẹ hơn.
 * Bỏ metadata của file gốc (vị trí GPS, ngày quay); worker cũng bỏ, đây là thêm một lớp.
 */
export function startVideoCompression(
  video: PickedVideo,
  onProgress: (percent: number) => void,
): VideoCompression {
  if (Platform.OS === 'web' || !shouldCompressVideo(video)) {
    return { compressing: false, result: Promise.resolve(video), dispose: () => {} };
  }
  let cancellationId: string | undefined;
  let outputUri: string | undefined;
  let disposed = false;
  const deleteOutput = () => {
    if (!outputUri) return;
    try {
      new File(outputUri).delete();
    } catch {
      // File tạm nằm trong cache của app, hệ điều hành sẽ dọn nếu xoá lỗi.
    }
  };

  const result = Video.compress(
    video.uri,
    {
      compressionMethod: 'manual',
      bitrate: VIDEO_COMPRESSION.targetBitrate,
      maxSize: VIDEO_COMPRESSION.maxLongEdge,
      preserveMetadata: false,
      progressDivider: 5,
      getCancellationId: (id) => {
        cancellationId = id;
      },
    },
    (progress) => {
      if (!disposed) onProgress(Math.min(100, Math.floor(progress <= 1 ? progress * 100 : progress)));
    },
  ).then(
    (uri) => {
      outputUri = uri;
      if (disposed) {
        deleteOutput();
        return video;
      }
      const compressed = fileVideoSource({
        uri,
        durationMs: video.durationMs,
        width: 0,
        height: 0,
        mimeType: 'video/mp4',
      });
      if (!compressed || compressed.sizeBytes >= video.sizeBytes) {
        deleteOutput();
        return video;
      }
      return compressed;
    },
    // Nén lỗi (máy không hỗ trợ, thiếu bộ nhớ...) thì vẫn đăng được bằng file gốc.
    () => video,
  );

  return {
    compressing: true,
    result,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (cancellationId && !outputUri) Video.cancelCompression(cancellationId);
      deleteOutput();
    },
  };
}
