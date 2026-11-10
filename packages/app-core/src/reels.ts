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

/** Video dọc phủ kín màn hình cao để không dư hai dải trên dưới, chỉ mất một phần nhỏ hai bên. Trường hợp khác giữ toàn khung. */
export function layoutReelVideo(aspect: ReelPlayback['aspect'], width: number, height: number) {
  if (aspect === '9:16' && height / width >= 16 / 9) {
    return { box: { width, height }, contentFit: 'cover' as const };
  }
  return { box: fitReelVideo(aspect, width, height), contentFit: 'contain' as const };
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

/** Sheet bình luận chừa phần trên màn hình để video thu nhỏ vẫn xem được. */
export function getReelCommentsSheetHeight(windowHeight: number): number {
  return Math.min(640, windowHeight * 0.65);
}

/** Thu video vào khoảng trống phía trên sheet bình luận, giữ tỉ lệ và căn dưới vùng an toàn. */
export function layoutReelCommentsVideo({
  windowHeight,
  slideHeight,
  topInset,
  gap,
}: {
  windowHeight: number;
  slideHeight: number;
  topInset: number;
  gap: number;
}): { scale: number; translateY: number } {
  if (slideHeight <= 0) return { scale: 1, translateY: 0 };
  const availableHeight = windowHeight - getReelCommentsSheetHeight(windowHeight) - topInset - gap;
  const scale = Math.max(0, Math.min(1, availableHeight / slideHeight));
  return { scale, translateY: topInset + (slideHeight * scale) / 2 - slideHeight / 2 };
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
