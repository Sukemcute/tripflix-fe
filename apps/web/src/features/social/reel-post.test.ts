import { describe, expect, it, vi } from 'vitest';
import type { FeedCardDto } from '@tripflix/api-client/core-api/model/index';
import {
  attachReelVideoSource,
  getReelRenderMode,
  pickReelAfterRemoval,
  prependPinnedReelCards,
  REEL_RENDER_WINDOW,
  shouldShowReelBackdrop,
  toReelPost,
} from './reel-post';

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

describe('getReelRenderMode', () => {
  it('bài đang xem và bài kế tiếp có video, bài vừa xem qua chỉ còn poster', () => {
    expect(getReelRenderMode(5, 5)).toBe('video');
    expect(getReelRenderMode(6, 5)).toBe('video');
    expect(getReelRenderMode(4, 5)).toBe('poster');
  });

  it('cách 2 bài vẫn render poster, xa hơn chỉ còn khung giữ chỗ', () => {
    expect(getReelRenderMode(7, 5)).toBe('poster');
    expect(getReelRenderMode(3, 5)).toBe('poster');
    expect(getReelRenderMode(8, 5)).toBe('placeholder');
    expect(getReelRenderMode(0, 5)).toBe('placeholder');
  });

  it('lướt 100 bài thì số bài render đầy đủ vẫn cố định', () => {
    const rendered = Array.from({ length: 100 }, (_, index) => getReelRenderMode(index, 50)).filter(
      (mode) => mode !== 'placeholder',
    );
    expect(rendered).toHaveLength(2 * REEL_RENDER_WINDOW + 1);
  });
});

describe('shouldShowReelBackdrop', () => {
  it('chỉ bài đang xem và hai bài sát cạnh có nền mờ', () => {
    expect([3, 4, 5, 6, 7].map((index) => shouldShowReelBackdrop(index, 5))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe('attachReelVideoSource', () => {
  function createFakeVideo() {
    const video = {
      src: '',
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn((name: string) => {
        if (name === 'src') video.src = '';
      }),
    };
    return video;
  }

  it('Strict Mode chạy gắn -> dọn -> gắn lại: video vẫn còn nguồn phát (lỗi cũ: mất src, đứng hình)', () => {
    const video = createFakeVideo();
    const release = attachReelVideoSource(video, 'https://cdn/reel/master.m3u8');
    release();
    attachReelVideoSource(video, 'https://cdn/reel/master.m3u8');
    expect(video.src).toBe('https://cdn/reel/master.m3u8');
  });

  it('dọn khi lướt ra xa: dừng, xoá nguồn và load() để ngắt tải segment', () => {
    const video = createFakeVideo();
    attachReelVideoSource(video, 'https://cdn/reel/master.m3u8')();
    expect(video.pause).toHaveBeenCalled();
    expect(video.removeAttribute).toHaveBeenCalledWith('src');
    expect(video.load).toHaveBeenCalled();
    expect(video.src).toBe('');
  });
});

describe('prependPinnedReelCards', () => {
  const card = (postId: string) => ({ postId });

  it('Reel từ link chia sẻ lên đầu, bỏ bản trùng trong bảng tin, giữ thứ tự còn lại', () => {
    expect(prependPinnedReelCards([card('b')], [card('a'), card('b'), card('c')]).map((c) => c.postId)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('không có Reel ghim (link hỏng, bài bị ẩn) thì là bảng tin như thường', () => {
    expect(prependPinnedReelCards([], [card('a'), card('c')]).map((c) => c.postId)).toEqual(['a', 'c']);
  });
});
