import { describe, expect, it } from 'vitest';
import type { SocialPostDetailDto, SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { getFocusedFeedPosts } from './focused-post';

const post: SocialPostDto = {
  id: 'opened-post',
  authorId: 'author',
  postType: 'vlog',
  title: 'Chuyến đi Hội An',
  body: 'Một ngày phố cổ',
  hashtags: [],
  status: 'published',
  visibility: 'public',
  isVerified: false,
  mediaIds: [],
  coverMediaId: null,
  tripAttachment: null,
  reactionCounts: {},
  reactionTotal: 2,
  commentCount: 3,
  shareCount: 0,
  bookmarkCount: 0,
  publishedAt: '2026-11-13T00:00:00Z',
  createdAt: '2026-11-13T00:00:00Z',
  updatedAt: '2026-11-13T00:00:00Z',
  deletedAt: null,
};
const detail: SocialPostDetailDto = {
  post,
  viewerContext: { myReaction: 'like', isBookmarked: true },
  shareUrl: '/trips/opened-post',
};
const otherPost = { ...post, id: 'recommended-post' };

describe('getFocusedFeedPosts', () => {
  it('không có link mở bài thì giữ feed gợi ý hiện tại', () => {
    const posts = [otherPost];
    expect(getFocusedFeedPosts({ posts, focusPostId: null, hasError: false })).toBe(posts);
  });

  it('mở được bài ngoài trang gợi ý đầu tiên, giữ viewerContext và thứ tự các bài còn lại', () => {
    const posts = getFocusedFeedPosts({ posts: [otherPost], focusPostId: post.id, detail, hasError: false });
    expect(posts.map((entry) => entry.id)).toEqual([post.id, otherPost.id]);
    expect(posts[0]?.viewerContext).toEqual(detail.viewerContext);
  });

  it('bài được ghim vẫn hiện khi feed chưa tải xong', () => {
    expect(getFocusedFeedPosts({ posts: [], focusPostId: post.id, detail, hasError: false })).toHaveLength(1);
  });

  it('trang sau có lại bài được ghim thì không render trùng, ưu tiên chi tiết mới', () => {
    const posts = getFocusedFeedPosts({
      posts: [otherPost, { ...post, reactionTotal: 0 }],
      focusPostId: post.id,
      detail,
      hasError: false,
    });
    expect(posts.map((entry) => entry.id)).toEqual([post.id, otherPost.id]);
    expect(posts[0]?.reactionTotal).toBe(2);
  });

  it('đang tải hoặc đổi link không hiện nhầm bài đầu feed hay chi tiết của link cũ', () => {
    expect(getFocusedFeedPosts({ posts: [otherPost], focusPostId: post.id, hasError: false })).toEqual([]);
    expect(
      getFocusedFeedPosts({ posts: [otherPost], focusPostId: 'another-post', detail, hasError: false }),
    ).toEqual([]);
  });

  it('bài bị xoá hoặc mất quyền xem không xuất hiện lại từ cache', () => {
    expect(getFocusedFeedPosts({ posts: [post], focusPostId: post.id, detail, hasError: true })).toEqual([]);
  });

  it('link tới Reel không làm video lọt vào tab Bài viết', () => {
    expect(
      getFocusedFeedPosts({
        posts: [otherPost],
        focusPostId: post.id,
        detail: { ...detail, post: { ...post, postType: 'video' } },
        hasError: false,
      }),
    ).toEqual([]);
  });
});
