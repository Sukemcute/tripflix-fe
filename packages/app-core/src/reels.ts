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

/** Fit the full video like feed-demo's VideoBox, including square clips. */
export function fitReelVideo(aspect: ReelPlayback['aspect'], width: number, height: number) {
  const ratios = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1 };
  const ratio = ratios[aspect];
  return { width: Math.min(width, height * ratio), height: Math.min(height, width / ratio) };
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
