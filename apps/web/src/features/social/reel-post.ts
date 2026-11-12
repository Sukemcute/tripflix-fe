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
 * - `video`: bài đang xem và bài kế tiếp (tải trước để lướt tới là phát ngay).
 * - `poster`: cách 1–2 bài, kể cả bài vừa xem qua (chỉ ảnh, không tải segment).
 * - `placeholder`: xa hơn, chỉ còn khung rỗng giữ chiều cao để cuộn và snap đúng vị trí.
 */
export type ReelRenderMode = 'video' | 'poster' | 'placeholder';

/** Số bài mỗi phía của bài đang xem vẫn được render đầy đủ nội dung. */
export const REEL_RENDER_WINDOW = 2;

export function getReelRenderMode(index: number, activeIndex: number): ReelRenderMode {
  const offset = index - activeIndex;
  if (offset === 0 || offset === 1) return 'video';
  if (Math.abs(offset) <= REEL_RENDER_WINDOW) return 'poster';
  return 'placeholder';
}

/** Nền mờ (filter: blur) tốn GPU: chỉ bật cho bài đang xem và hai bài sát cạnh. */
export function shouldShowReelBackdrop(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) <= 1;
}
