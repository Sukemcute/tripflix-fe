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
