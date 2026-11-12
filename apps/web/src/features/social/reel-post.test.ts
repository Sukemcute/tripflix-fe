import { describe, expect, it } from 'vitest';
import type { FeedCardDto } from '@tripflix/api-client/core-api/model/index';
import { pickReelAfterRemoval, toReelPost } from './reel-post';

const card: FeedCardDto = {
  postId: 'post-1',
  author: { id: 'author-1', name: 'Minh', avatarUrl: null, isKol: false },
  video: {
    hlsUrl: 'https://cdn/master.m3u8',
    posters: { w360: 'a', w540: 'b', w720: 'c' },
    durationSec: 30,
    aspect: '9:16',
    levels: [360],
  },
  title: 'Đà Nẵng 3 ngày',
  caption: 'Lịch trình chi tiết',
  region: null,
  tags: ['danang'],
  linkedProductIds: [],
  tripAttachment: { destinationName: 'Đà Nẵng', daysCount: 3 },
  counts: { likes: 5, comments: 4, saves: 3, shares: 2 },
  viewerState: null,
  reason: null,
};

describe('toReelPost', () => {
  it('chuyển thẻ feed thành dữ liệu bài cho màn Reels, giữ số đếm và lộ trình', () => {
    expect(toReelPost(card)).toEqual({
      id: 'post-1',
      authorId: 'author-1',
      authorName: 'Minh',
      postType: 'video',
      title: 'Đà Nẵng 3 ngày',
      body: 'Lịch trình chi tiết',
      hashtags: ['danang'],
      mediaIds: [],
      tripAttachment: { destinationName: 'Đà Nẵng', daysCount: 3 },
      isVerified: false,
      reactionTotal: 5,
      commentCount: 4,
      bookmarkCount: 3,
      shareCount: 2,
    });
  });

  it('thẻ chưa có tripAttachment thì trả null để bộ lọc có lộ trình bỏ qua', () => {
    const { tripAttachment: _omitted, ...withoutTrip } = card;
    expect(toReelPost(withoutTrip).tripAttachment).toBeNull();
  });
});

describe('pickReelAfterRemoval', () => {
  it('bỏ bài đang xem thì xem tiếp bài kế', () => {
    expect(pickReelAfterRemoval(['a', 'b', 'c'], 'b')).toBe('c');
  });

  it('bỏ bài cuối thì lùi về bài trước', () => {
    expect(pickReelAfterRemoval(['a', 'b'], 'b')).toBe('a');
  });

  it('bỏ bài duy nhất hoặc bài không có trong danh sách thì không chọn bài nào', () => {
    expect(pickReelAfterRemoval(['a'], 'a')).toBeNull();
    expect(pickReelAfterRemoval(['a'], 'x')).toBeNull();
  });
});
