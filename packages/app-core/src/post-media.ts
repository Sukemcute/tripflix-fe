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
