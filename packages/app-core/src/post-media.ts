export const POST_MEDIA_LIMITS = { images: 10, videoDurationMs: 300_000 } as const;

export interface PostMediaMetadata {
  type?: string | null;
  durationMs?: number | null;
  width: number;
  height: number;
}

export type PostMediaError = 'tooManyImages' | 'invalidMedia' | 'tooLong' | 'unknownDuration';

/** Validate the complete selection before replacing the current draft. */
export function validatePostMedia(
  assets: readonly PostMediaMetadata[],
  kind: 'image' | 'video',
): PostMediaError | null {
  if (
    !assets.length ||
    assets.some(
      (asset) =>
        asset.type !== kind ||
        !Number.isFinite(asset.width) ||
        !Number.isFinite(asset.height) ||
        asset.width <= 0 ||
        asset.height <= 0,
    )
  )
    return 'invalidMedia';
  if (kind === 'image') return assets.length > POST_MEDIA_LIMITS.images ? 'tooManyImages' : null;
  if (assets.length !== 1) return 'invalidMedia';
  const durationMs = assets[0]!.durationMs;
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs <= 0) return 'unknownDuration';
  return durationMs > POST_MEDIA_LIMITS.videoDurationMs ? 'tooLong' : null;
}

/**
 * Nén video trên điện thoại trước khi tải lên: chỉ để file nhẹ, tải nhanh.
 * Worker vẫn chuyển mã ra 360p, 540p, 720p như cũ, nên bản nén chỉ cần đủ tốt cho 720p.
 * Đo ngày 12/11 với video iPhone 1080p 60 fps 23 Mbps: nén còn 1080p ~7 Mbps làm 720p
 * giảm ~3 điểm VMAF; dùng 12 Mbps để bớt mất chất lượng ở đoạn chuyển động nhiều.
 */
export const VIDEO_COMPRESSION = {
  /** Cạnh dài tối đa sau khi nén (1080p dọc là 1080x1920). */
  maxLongEdge: 1920,
  targetBitrate: 12_000_000,
  /** Video đã ≤1080p và tổng bitrate dưới mức này thì gửi nguyên: nén lại chỉ mất chất lượng. */
  skipBelowBitrate: 15_000_000,
} as const;

export interface VideoCompressionInput {
  width: number;
  height: number;
  sizeBytes: number;
  durationMs: number;
}

/** Có nên nén video này trước khi tải lên không. Thiếu thông tin thì nén cho chắc. */
export function shouldCompressVideo(video: VideoCompressionInput): boolean {
  const longEdge = Math.max(video.width, video.height);
  const seconds = video.durationMs / 1000;
  if (!(longEdge > 0) || !(seconds > 0) || !(video.sizeBytes > 0)) return true;
  const bitrate = (video.sizeBytes * 8) / seconds;
  return longEdge > VIDEO_COMPRESSION.maxLongEdge || bitrate > VIDEO_COMPRESSION.skipBelowBitrate;
}
