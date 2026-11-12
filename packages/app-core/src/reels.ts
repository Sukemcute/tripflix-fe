export interface ReelPlayback {
  hlsUrl: string;
  posters: { w360: string; w540: string; w720: string };
  durationSec: number;
  aspect: '9:16' | '16:9' | '1:1';
  levels: readonly number[];
}

export function selectReelPoster(posters: ReelPlayback['posters'], width: number): string {
  if (width <= 360) return posters.w360;
  if (width <= 540) return posters.w540;
  return posters.w720;
}

/** Ảnh bìa của các video kế tiếp, tải trước để lướt tới là có hình ngay. */
export function getReelPosterPrefetchUrls(
  posterSets: readonly ReelPlayback['posters'][],
  activeIndex: number,
  width: number,
  count = 3,
): string[] {
  return posterSets
    .slice(activeIndex + 1, activeIndex + 1 + count)
    .map((posters) => selectReelPoster(posters, width))
    .filter((url) => url.length > 0);
}

/** Fit the full video like feed-demo's VideoBox, including square clips. */
export function fitReelVideo(aspect: ReelPlayback['aspect'], width: number, height: number) {
  const ratios = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1 };
  const ratio = ratios[aspect];
  return { width: Math.min(width, height * ratio), height: Math.min(height, width / ratio) };
}

/** Phần trên dưới được phép cắt khi khung thấp hơn 9:16; quá mức này mới giữ toàn khung và nền mờ hai bên. */
export const REEL_MAX_CROP = 0.15;

/**
 * Video dọc phủ kín khung như TikTok: khung cao hơn 9:16 thì cắt nhẹ hai bên, khung thấp hơn (máy 16:9, khung trình duyệt)
 * thì cắt trên dưới khi không quá REEL_MAX_CROP. Video ngang, vuông hay khung quá thấp (máy tính bảng) giữ toàn khung.
 */
export function layoutReelVideo(aspect: ReelPlayback['aspect'], width: number, height: number) {
  const isTallBox = height / width >= 16 / 9;
  const verticalCrop = 1 - height / ((width * 16) / 9);
  if (aspect === '9:16' && (isTallBox || verticalCrop <= REEL_MAX_CROP)) {
    return { box: { width, height }, contentFit: 'cover' as const };
  }
  return { box: fitReelVideo(aspect, width, height), contentFit: 'contain' as const };
}

/** Hệ số co giãn icon, chữ trên reel theo bề ngang máy, lấy 390pt (iPhone 12–16) làm chuẩn. */
export function getReelScale(width: number): number {
  return Math.min(1.15, Math.max(0.85, width / 390));
}

/** Số ký tự giữ lại khi caption dài hơn `maxLines`, chừa chỗ cho chữ nối ở cuối dòng. Trả về `null` nếu caption vừa đủ. */
export function getCollapsedCaptionLength(
  lineTexts: readonly string[],
  maxLines: number,
  reservedChars: number,
): number | null {
  if (lineTexts.length <= maxLines) return null;
  const visibleChars = lineTexts.slice(0, maxLines).reduce((total, line) => total + line.length, 0);
  return Math.max(0, visibleChars - reservedChars);
}

/** Tab sau khi thả tay: đổi khi kéo quá 1/4 màn hình hoặc vuốt nhanh cùng chiều kéo, không vượt quá tab đầu và cuối. */
/** Whether a horizontal swipe has gone far or fast enough to leave the screen. */
export function isBackSwipeComplete({
  translationX,
  velocityX,
}: {
  translationX: number;
  velocityX: number;
}): boolean {
  'worklet';
  const isSameDirection = translationX * velocityX >= 0;
  const isFlick = isSameDirection && Math.abs(velocityX) > 600 && Math.abs(translationX) > 20;
  return isFlick || Math.abs(translationX) > 80;
}

export function getSwipedTabIndex({
  currentIndex,
  tabCount,
  translationX,
  velocityX,
  width,
}: {
  currentIndex: number;
  tabCount: number;
  translationX: number;
  velocityX: number;
  width: number;
}): number {
  'worklet';
  const isFlick = Math.abs(velocityX) > 500;
  if (isFlick && Math.sign(velocityX) !== Math.sign(translationX)) return currentIndex;
  if (!isFlick && Math.abs(translationX) <= width / 4) return currentIndex;
  const nextIndex = currentIndex + (translationX < 0 ? 1 : -1);
  return Math.max(0, Math.min(tabCount - 1, nextIndex));
}

/** Phần còn lại phía trên khung bình luận dành cho video. */
export function getReelCommentsSheetHeight(windowHeight: number): number {
  return Math.min(680, Math.round(windowHeight * 0.68));
}

/** Căn giữa toàn bộ khung video trong khoảng trống phía trên bình luận. */
export function layoutReelCommentsVideo({
  aspect,
  slideWidth,
  windowHeight,
  topInset,
}: {
  aspect: ReelPlayback['aspect'];
  slideWidth: number;
  windowHeight: number;
  topInset: number;
}) {
  const visibleBottom = windowHeight - getReelCommentsSheetHeight(windowHeight);
  const visibleHeight = Math.max(0, visibleBottom - topInset);
  const box = fitReelVideo(aspect, slideWidth, visibleHeight);
  return {
    ...box,
    left: (slideWidth - box.width) / 2,
    top: topInset + (visibleHeight - box.height) / 2,
  };
}

/** Mỗi vị trí trong cửa sổ dùng một slot khác nhau, kể cả khi vuốt ngược. */
export function getReelPlayerIndexes(count: number, activeIndex: number): (number | null)[] {
  const slots: (number | null)[] = [null, null, null];
  for (let index = Math.max(0, activeIndex - 1); index <= Math.min(count - 1, activeIndex + 1); index++) {
    slots[index % 3] = index;
  }
  return slots;
}

/** Giới hạn theo cạnh ngắn, vì mức 540p của video dọc có kích thước 540×960. */
export function getReelResolutionCap(aspect: ReelPlayback['aspect']): { width: number; height: number } {
  if (aspect === '9:16') return { width: 540, height: 960 };
  if (aspect === '16:9') return { width: 960, height: 540 };
  return { width: 540, height: 540 };
}
