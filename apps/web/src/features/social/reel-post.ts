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
  | 'video'
>;

const defaultReelPostCache = new WeakMap<FeedCardDto, ReelPost>();

/**
 * Chuyển thẻ feed sang `ReelPost` và giữ nguyên tham chiếu khi `card` không đổi (cache theo WeakMap),
 * để thao tác trên một Reel (ví dụ bấm tim) không tạo mới `ReelPost` của các Reel khác.
 */
export function toReelPost(
  card: FeedCardDto,
  cache: WeakMap<FeedCardDto, ReelPost> = defaultReelPostCache,
): ReelPost {
  const cached = cache.get(card);
  if (cached) return cached;

  const post: ReelPost = {
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
    video: card.video,
  };
  cache.set(card, post);
  return post;
}

/** Chuyển SocialPostDto (đã có video từ backend) sang ReelPost. */
export function socialPostToReelPost(post: SocialPostDto): ReelPost {
  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.authorName,
    postType: 'video',
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    mediaIds: post.mediaIds,
    tripAttachment: post.tripAttachment,
    isVerified: post.isVerified,
    reactionTotal: post.reactionTotal,
    commentCount: post.commentCount,
    bookmarkCount: post.bookmarkCount,
    shareCount: post.shareCount,
    video: post.video ?? null,
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
 * - `video`: bài đang xem, 2 bài phía trước (tải sẵn để lướt nhanh vẫn phát ngay) và 2 bài phía sau (giữ phần đã
 *   tải để lướt ngược không tải lại). Tối đa 5 thẻ video, nhưng không quá 4 bài được gắn nguồn mới
 *   (shouldLoadReelSource).
 * - `poster`: ngoài cửa sổ video tới 3 bài (chỉ ảnh, không tải segment). Rời cửa sổ video là gỡ nguồn, xoá bộ đệm.
 * - `placeholder`: xa hơn, chỉ còn khung rỗng giữ chiều cao để cuộn và snap đúng vị trí.
 */
export type ReelRenderMode = 'video' | 'poster' | 'placeholder';

/** Số bài phía trước bài đang xem có thẻ video. */
export const REEL_AHEAD_VIDEO_COUNT = 2;
/**
 * Số bài phía sau bài đang xem còn giữ thẻ video. Bài phía sau đã được gắn nguồn từ lúc còn là bài đang xem nên chỉ
 * giữ bộ đệm, gần như không tải thêm (REEL_BEHIND_BUFFER_SECONDS); lướt ngược 2 bài vẫn phát ngay.
 */
export const REEL_BEHIND_VIDEO_COUNT = 2;
/**
 * Số bài phía sau được gắn nguồn mới (khi nhảy tới một bài chưa từng xem): 5 video cùng tải làm video đang xem chậm
 * chạy (đo được), nên bài thứ 2 phía sau chỉ giữ nguồn đã có chứ không tải mới.
 */
const REEL_BEHIND_LOAD_COUNT = 1;
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
 * bài thứ 2 phía trước và bài ngay phía sau chỉ tải khi video đang xem đã chạy, để lúc vừa lướt không có quá 2 video
 * tranh băng thông. Bài phía sau thường đã được gắn từ lúc còn là bài đang xem và giữ nguồn tới khi rời cửa sổ video;
 * bài thứ 2 phía sau không được gắn mới (REEL_BEHIND_LOAD_COUNT).
 */
export function shouldLoadReelSource(index: number, activeIndex: number, isActivePlaying: boolean): boolean {
  const offset = index - activeIndex;
  if (offset === 0 || offset === 1) return true;
  return isActivePlaying && offset >= -REEL_BEHIND_LOAD_COUNT && offset <= REEL_AHEAD_VIDEO_COUNT;
}

/**
 * Bỏ khỏi tập "đã có hình đầu tiên" các bài đã ra khỏi cửa sổ video (getReelRenderMode khác `video`): thẻ <video>
 * của chúng đã bị gỡ, nguồn và bộ đệm bị nhả, nên quay lại phải tải lại từ đầu. Giữ lại thì canStepToNextReel không
 * chặn, người xem lướt vào vòng chờ. Bài bị bỏ khỏi danh sách cũng bị bỏ. Trả Set mới, không sửa Set cũ.
 */
export function pruneReadyReelIds(
  readyIds: ReadonlySet<string>,
  postIds: readonly string[],
  activeIndex: number,
): Set<string> {
  const kept = new Set<string>();
  postIds.forEach((postId, index) => {
    if (readyIds.has(postId) && getReelRenderMode(index, activeIndex) === 'video') kept.add(postId);
  });
  return kept;
}

/** Thời gian chặn lướt tối đa khi bài kế tiếp chưa có hình: Safari iPhone không tải trước video, chặn mãi thì kẹt. */
export const REEL_NEXT_NOT_READY_BLOCK_MS = 3_000;

export function startReelOnPostChange(
  video: Pick<HTMLVideoElement, 'currentTime'> | null,
  previousPostId: string | null | undefined,
  postId: string | null | undefined,
  play: () => void,
): void {
  if (!video || !postId || postId === previousPostId) return;
  if (video.currentTime > 0.1) video.currentTime = 0;
  play();
}

/** Mốc thời gian trên thanh tua như TikTok: 17 → "0:17", 65 → "1:05". Giá trị lạ (NaN, âm) coi như 0. */
export function formatReelTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Bước tua bằng phím ← / → trên thanh tua. */
export const REEL_SEEK_KEY_STEP_SECONDS = 5;

/**
 * Mốc tua khi bấm phím trên thanh tua: ← / → lùi, tiến REEL_SEEK_KEY_STEP_SECONDS giây, Home / End về đầu, cuối;
 * giữ trong [0, duration]. Phím khác (kể cả ↑ / ↓ để chuyển bài) trả null: thanh tua không xử lý.
 */
export function getReelKeySeekTarget(key: string, currentTime: number, duration: number): number | null {
  const end = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const clamp = (seconds: number) => Math.min(end, Math.max(0, seconds));
  if (key === 'ArrowRight') return clamp(currentTime + REEL_SEEK_KEY_STEP_SECONDS);
  if (key === 'ArrowLeft') return clamp(currentTime - REEL_SEEK_KEY_STEP_SECONDS);
  if (key === 'Home') return 0;
  if (key === 'End') return end;
  return null;
}

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
 * Mở Reel từ link chia sẻ: Reel đó lên đầu, lướt tiếp là bảng tin Reels như thường. Mỗi Reel chỉ giữ lần xuất hiện
 * đầu: bảng tin gợi ý phân trang bằng offset, khi job gợi ý (10 phút) chạy giữa hai trang thì thứ hạng đổi và trang
 * sau có thể lặp bài của trang trước (React báo trùng key, lướt nhảy về bài cũ).
 */
export function prependPinnedReelCards<T extends { postId: string }>(pinnedCards: readonly T[], feedCards: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...pinnedCards, ...feedCards].filter((card) => !seen.has(card.postId) && Boolean(seen.add(card.postId)));
}

/** Trạng thái và số đếm tương tác của một Reel trên cột thao tác bên phải. */
export interface ReelEngagement {
  isLiked: boolean;
  isSaved: boolean;
  likes: number;
  saves: number;
  comments: number;
  shares: number;
}

/** Tính số đếm hiển thị theo dữ liệu máy chủ cộng/trừ thao tác lạc quan tại máy. */
export function computeReelEngagement(params: {
  post: Pick<ReelPost, 'reactionTotal' | 'bookmarkCount' | 'commentCount' | 'shareCount'>;
  detailPost?: Pick<SocialPostDto, 'reactionTotal' | 'bookmarkCount' | 'commentCount' | 'shareCount'>;
  serverLiked: boolean;
  serverSaved: boolean;
  optimisticLiked?: boolean;
  optimisticSaved?: boolean;
}): ReelEngagement {
  const isLiked = params.optimisticLiked ?? params.serverLiked;
  const isSaved = params.optimisticSaved ?? params.serverSaved;
  return {
    isLiked,
    isSaved,
    likes: Math.max(
      0,
      (params.detailPost?.reactionTotal ?? params.post.reactionTotal) + Number(isLiked) - Number(params.serverLiked),
    ),
    saves: Math.max(
      0,
      (params.detailPost?.bookmarkCount ?? params.post.bookmarkCount) + Number(isSaved) - Number(params.serverSaved),
    ),
    comments: params.detailPost?.commentCount ?? params.post.commentCount,
    shares: params.detailPost?.shareCount ?? params.post.shareCount,
  };
}

/**
 * Giữ nguyên tham chiếu object `ReelEngagement` cũ nếu cả 6 giá trị chưa đổi,
 * giúp `React.memo(MediaTrackItem)` và `React.memo(ReelActionRail)` bỏ qua các Reel không bị bấm.
 */
export function reuseReelEngagement(
  cache: Map<string, ReelEngagement>,
  postId: string,
  next: ReelEngagement,
): ReelEngagement {
  const prev = cache.get(postId);
  if (
    prev &&
    prev.isLiked === next.isLiked &&
    prev.isSaved === next.isSaved &&
    prev.likes === next.likes &&
    prev.saves === next.saves &&
    prev.comments === next.comments &&
    prev.shares === next.shares
  ) {
    return prev;
  }
  cache.set(postId, next);
  return next;
}
