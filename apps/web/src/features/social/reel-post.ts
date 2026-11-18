import type { FeedCardDto, SocialPostDto } from '@tripflix/api-client/core-api/model/index';

/** Phần dữ liệu bài mà màn Reels cần; lấy được từ thẻ /v1/feed lẫn bài /v1/posts. */
export type ReelPost = Pick<
  SocialPostDto,
  | 'id'
  | 'authorId'
  | 'authorName'
  | 'postType'
  | 'title'
  | 'body'
  | 'hashtags'
  | 'mediaIds'
  | 'tripAttachment'
  | 'isVerified'
  | 'reactionTotal'
  | 'commentCount'
  | 'bookmarkCount'
  | 'shareCount'
>;

export function toReelPost(card: FeedCardDto): ReelPost {
  return {
    id: card.postId,
    authorId: card.author.id,
    authorName: card.author.name,
    postType: 'video',
    title: card.title,
    body: card.caption,
    hashtags: card.tags,
    // Link phát nằm ở card.video; mediaIds chỉ dùng dựng ảnh bìa dự phòng.
    mediaIds: [],
    tripAttachment: card.tripAttachment ?? null,
    // Thẻ feed chưa có dấu xác minh; thiếu thì coi như chưa xác minh thay vì đoán.
    isVerified: false,
    reactionTotal: card.counts.likes,
    commentCount: card.counts.comments,
    bookmarkCount: card.counts.saves,
    shareCount: card.counts.shares,
  };
}

/**
 * Bài đang xem bị bỏ khỏi danh sách (bỏ lưu trong "Đã lưu"): xem tiếp bài kế, hết thì bài trước,
 * để màn hình đứng yên tại chỗ thay vì nhảy về bài đầu.
 */
export function pickReelAfterRemoval(postIds: readonly string[], removedId: string): string | null {
  const index = postIds.indexOf(removedId);
  if (index < 0) return null;
  return postIds[index + 1] ?? postIds[index - 1] ?? null;
}

/**
 * Mức render của một Reel theo khoảng cách tới bài đang xem, để lướt lâu không nặng dần:
 * - `video`: bài đang xem, 2 bài phía trước (tải sẵn để lướt nhanh vẫn phát ngay) và 1 bài phía sau (giữ phần đã
 *   tải để lướt ngược không tải lại).
 * - `poster`: ngoài cửa sổ video tới 3 bài (chỉ ảnh, không tải segment). Rời cửa sổ video là gỡ nguồn, xoá bộ đệm.
 * - `placeholder`: xa hơn, chỉ còn khung rỗng giữ chiều cao để cuộn và snap đúng vị trí.
 */
export type ReelRenderMode = 'video' | 'poster' | 'placeholder';

/** Số bài phía trước bài đang xem có thẻ video. */
export const REEL_AHEAD_VIDEO_COUNT = 2;
/** Số bài phía sau bài đang xem còn giữ thẻ video: 5 video cùng tải làm video đang xem chậm chạy (đo được). */
export const REEL_BEHIND_VIDEO_COUNT = 1;
/** Số bài mỗi phía của bài đang xem vẫn được render đầy đủ nội dung. */
export const REEL_RENDER_WINDOW = 3;

export function getReelRenderMode(index: number, activeIndex: number): ReelRenderMode {
  const offset = index - activeIndex;
  if (offset >= -REEL_BEHIND_VIDEO_COUNT && offset <= REEL_AHEAD_VIDEO_COUNT) return 'video';
  if (Math.abs(offset) <= REEL_RENDER_WINDOW) return 'poster';
  return 'placeholder';
}

/**
 * Bài nào được gắn nguồn ngay (ưu tiên video đang xem, như app video ngắn): bài đang xem và bài kế tiếp luôn được;
 * bài thứ 2 phía trước chỉ tải khi video đang xem đã chạy, để lúc vừa lướt không có quá 2 video tranh băng thông.
 * Bài phía sau đã được gắn từ lúc còn là bài đang xem nên không cần tải lại.
 */
export function shouldLoadReelSource(index: number, activeIndex: number, isActivePlaying: boolean): boolean {
  const offset = index - activeIndex;
  if (offset === 0 || offset === 1) return true;
  return isActivePlaying && offset >= -REEL_BEHIND_VIDEO_COUNT && offset <= REEL_AHEAD_VIDEO_COUNT;
}

/** Thời gian chặn lướt tối đa khi bài kế tiếp chưa có hình: Safari iPhone không tải trước video, chặn mãi thì kẹt. */
export const REEL_NEXT_NOT_READY_BLOCK_MS = 3_000;

/**
 * Có cho lướt sang bài kế tiếp không. Bài kế tiếp chưa có hình đầu tiên thì chặn (giống lúc hết video) để người
 * xem không lướt vào khung đen; chặn tối đa REEL_NEXT_NOT_READY_BLOCK_MS tính từ lần lướt đầu bị chặn.
 */
export function canStepToNextReel({
  isNextReady,
  blockedSinceMs,
  nowMs,
}: {
  isNextReady: boolean;
  blockedSinceMs: number | null;
  nowMs: number;
}): boolean {
  if (isNextReady) return true;
  return blockedSinceMs !== null && nowMs - blockedSinceMs >= REEL_NEXT_NOT_READY_BLOCK_MS;
}

/** Giây video đệm trước của bài đang xem, giống Reels mobile. */
export const REEL_CURRENT_BUFFER_SECONDS = 30;
/** Bài phía trước chỉ tải sẵn đoạn đầu: đủ để lướt tới là phát ngay mà không tốn dữ liệu cho bài có thể bị bỏ qua. */
export const REEL_AHEAD_BUFFER_SECONDS = 10;
/** Bài phía sau giữ phần đã tải, gần như không tải thêm. */
export const REEL_BEHIND_BUFFER_SECONDS = 4;

/** Số giây hls.js được đệm trước cho một Reel trong cửa sổ video, theo vị trí so với bài đang xem. */
export function getReelBufferSeconds(index: number, activeIndex: number): number {
  if (index === activeIndex) return REEL_CURRENT_BUFFER_SECONDS;
  return index > activeIndex ? REEL_AHEAD_BUFFER_SECONDS : REEL_BEHIND_BUFFER_SECONDS;
}

/** Nền mờ (filter: blur) tốn GPU: chỉ bật cho bài đang xem và hai bài sát cạnh. */
export function shouldShowReelBackdrop(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) <= 1;
}

/** Phần của thẻ <video> mà việc gắn/nhả nguồn phát cần (để test được không cần DOM). */
export type ReelVideoSource = Pick<HTMLVideoElement, 'src' | 'pause' | 'removeAttribute' | 'load'>;

/**
 * Gắn nguồn phát trong effect thay vì qua prop `src`: effect dọn (releaseReelVideoSource) xoá `src`, mà
 * React không gắn lại prop không đổi. React dev (Strict Mode) chạy effect -> dọn -> chạy lại ngay khi
 * thẻ mới hiện, nên để `src` ở prop thì video đang xem và video kế tiếp mất nguồn, đứng hình.
 * Trả về hàm dọn cho useEffect.
 */
export function attachReelVideoSource(video: ReelVideoSource, url: string): () => void {
  video.src = url;
  return () => releaseReelVideoSource(video);
}

/**
 * Chỉ pause() hoặc gỡ khỏi DOM thì trình duyệt vẫn có thể tải tiếp segment, giữ bộ đệm và bộ giải mã tới lúc
 * dọn rác. Xoá src rồi load() để ngắt tải và trả tài nguyên ngay.
 */
export function releaseReelVideoSource(video: ReelVideoSource): void {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

/**
 * Mở Reel từ link chia sẻ: Reel đó lên đầu, lướt tiếp là bảng tin Reels như thường (bỏ bản trùng nếu bảng tin
 * cũng có Reel đó).
 */
export function prependPinnedReelCards<T extends { postId: string }>(pinnedCards: readonly T[], feedCards: readonly T[]): T[] {
  if (pinnedCards.length === 0) return [...feedCards];
  const pinnedIds = new Set(pinnedCards.map((card) => card.postId));
  return [...pinnedCards, ...feedCards.filter((card) => !pinnedIds.has(card.postId))];
}
