import { describe, expect, it, vi } from 'vitest';
import type { FeedCardDto } from '@tripflix/api-client/core-api/model/index';
import {
  attachReelVideoSource,
  canStepToNextReel,
  computeReelEngagement,
  formatReelTime,
  getReelKeySeekTarget,
  getReelBufferSeconds,
  getReelRenderMode,
  pickReelAfterRemoval,
  prependPinnedReelCards,
  pruneReadyReelIds,
  reuseReelEngagement,
  REEL_AHEAD_BUFFER_SECONDS,
  REEL_AHEAD_VIDEO_COUNT,
  REEL_BEHIND_BUFFER_SECONDS,
  REEL_BEHIND_VIDEO_COUNT,
  REEL_CURRENT_BUFFER_SECONDS,
  REEL_NEXT_NOT_READY_BLOCK_MS,
  REEL_RENDER_WINDOW,
  shouldLoadReelSource,
  startReelOnPostChange,
  shouldShowReelBackdrop,
  socialPostToReelPost,
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
  isVerified: false,
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
      video: card.video,
    });
  });

  it('chuyển SocialPostDto có video sang ReelPost đầy đủ', () => {
    const post = {
      id: 'post-1',
      authorId: 'author-1',
      authorName: 'Minh',
      postType: 'video' as const,
      title: 'Đà Nẵng 3 ngày',
      body: 'Lịch trình chi tiết',
      hashtags: ['danang'],
      mediaIds: ['media-1'],
      tripAttachment: { destinationName: 'Đà Nẵng', daysCount: 3 },
      isVerified: true,
      reactionTotal: 10,
      commentCount: 2,
      bookmarkCount: 5,
      shareCount: 1,
      video: card.video,
      status: 'published' as const,
      visibility: 'public' as const,
      coverMediaId: null,
      images: [],
      reactionCounts: {},
      publishedAt: null,
      deletedAt: null,
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    };

    expect(socialPostToReelPost(post)).toEqual({
      id: 'post-1',
      authorId: 'author-1',
      authorName: 'Minh',
      postType: 'video',
      title: 'Đà Nẵng 3 ngày',
      body: 'Lịch trình chi tiết',
      hashtags: ['danang'],
      mediaIds: ['media-1'],
      tripAttachment: { destinationName: 'Đà Nẵng', daysCount: 3 },
      isVerified: true,
      reactionTotal: 10,
      commentCount: 2,
      bookmarkCount: 5,
      shareCount: 1,
      video: card.video,
    });
  });

  it('thẻ chưa có tripAttachment thì trả null để bộ lọc có lộ trình bỏ qua', () => {
    const { tripAttachment: _omitted, ...withoutTrip } = card;
    expect(toReelPost(withoutTrip).tripAttachment).toBeNull();
  });

  it('cùng thẻ feed thì trả về đúng cùng object ReelPost; thẻ đổi tham chiếu thì trả object mới', () => {
    const cache = new WeakMap<FeedCardDto, ReturnType<typeof toReelPost>>();
    const otherCard: FeedCardDto = { ...card, postId: 'post-2' };

    const first = toReelPost(card, cache);
    const second = toReelPost(card, cache);
    const untouched = toReelPost(otherCard, cache);
    expect(second).toBe(first);
    expect(toReelPost(card)).toBe(toReelPost(card));

    const updatedCard: FeedCardDto = {
      ...card,
      counts: { ...card.counts, likes: card.counts.likes + 1 },
    };
    const updated = toReelPost(updatedCard, cache);
    expect(updated).not.toBe(first);
    expect(updated.reactionTotal).toBe(6);
    expect(toReelPost(otherCard, cache)).toBe(untouched);
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
  it('bài đang xem, 2 bài phía trước và 2 bài phía sau có video', () => {
    for (const index of [3, 4, 5, 6, 7]) expect(getReelRenderMode(index, 5)).toBe('video');
  });

  it('bài thứ 3 phía sau và phía trước chỉ còn poster (đã gỡ video, xoá bộ đệm); xa hơn chỉ còn khung giữ chỗ', () => {
    expect(getReelRenderMode(2, 5)).toBe('poster');
    expect(getReelRenderMode(8, 5)).toBe('poster');
    expect(getReelRenderMode(9, 5)).toBe('placeholder');
    expect(getReelRenderMode(0, 5)).toBe('placeholder');
  });

  it('video đầu tiên: chỉ có video phía trước', () => {
    expect(getReelRenderMode(0, 0)).toBe('video');
    expect(getReelRenderMode(2, 0)).toBe('video');
    expect(getReelRenderMode(3, 0)).toBe('poster');
  });

  it('lướt 100 bài thì số bài render đầy đủ vẫn cố định', () => {
    const rendered = Array.from({ length: 100 }, (_, index) => getReelRenderMode(index, 50)).filter(
      (mode) => mode !== 'placeholder',
    );
    expect(rendered).toHaveLength(2 * REEL_RENDER_WINDOW + 1);
  });

  it('lướt 100 bài thì số thẻ video luôn tối đa 5', () => {
    for (const active of [0, 1, 50, 99]) {
      const videos = Array.from({ length: 100 }, (_, index) => getReelRenderMode(index, active)).filter(
        (mode) => mode === 'video',
      );
      expect(videos.length).toBeLessThanOrEqual(REEL_BEHIND_VIDEO_COUNT + 1 + REEL_AHEAD_VIDEO_COUNT);
      expect(videos.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('shouldLoadReelSource', () => {
  it('vừa lướt tới (video đang xem chưa chạy): chỉ tải bài đang xem và bài kế tiếp', () => {
    expect([3, 4, 5, 6, 7].map((index) => shouldLoadReelSource(index, 5, false))).toEqual([
      false,
      false,
      true,
      true,
      false,
    ]);
  });

  it('video đang xem đã chạy: tải thêm bài thứ 2 phía trước; bài phía sau giữ nguồn đã gắn', () => {
    expect([4, 5, 6, 7].map((index) => shouldLoadReelSource(index, 5, true))).toEqual([true, true, true, true]);
    expect(shouldLoadReelSource(8, 5, true)).toBe(false);
    expect(shouldLoadReelSource(3, 5, true)).toBe(false);
  });

  it('bài thứ 2 phía sau có thẻ video nhưng không được gắn nguồn mới: chỉ giữ nguồn đã gắn lúc còn là bài đang xem', () => {
    expect(getReelRenderMode(3, 5)).toBe('video');
    expect(shouldLoadReelSource(3, 5, true)).toBe(false);
    const loading = Array.from({ length: 100 }, (_, index) => shouldLoadReelSource(index, 50, true)).filter(Boolean);
    expect(loading).toHaveLength(4);
  });
});

describe('formatReelTime', () => {
  it('ghi mốc kiểu TikTok: phút:giây, giây luôn 2 chữ số', () => {
    expect(formatReelTime(17)).toBe('0:17');
    expect(formatReelTime(23.9)).toBe('0:23');
    expect(formatReelTime(65)).toBe('1:05');
    expect(formatReelTime(600)).toBe('10:00');
  });

  it('giá trị lạ (chưa có độ dài video, âm) coi như 0', () => {
    expect(formatReelTime(Number.NaN)).toBe('0:00');
    expect(formatReelTime(Number.POSITIVE_INFINITY)).toBe('0:00');
    expect(formatReelTime(-3)).toBe('0:00');
  });
});

describe('getReelKeySeekTarget', () => {
  it('← / → lùi, tiến 5 giây, giữ trong độ dài video', () => {
    expect(getReelKeySeekTarget('ArrowRight', 10, 23)).toBe(15);
    expect(getReelKeySeekTarget('ArrowLeft', 10, 23)).toBe(5);
    expect(getReelKeySeekTarget('ArrowRight', 21, 23)).toBe(23);
    expect(getReelKeySeekTarget('ArrowLeft', 2, 23)).toBe(0);
  });

  it('Home / End về đầu, cuối; ↑ / ↓ và phím khác để chuyển bài, thanh tua không xử lý', () => {
    expect(getReelKeySeekTarget('Home', 10, 23)).toBe(0);
    expect(getReelKeySeekTarget('End', 10, 23)).toBe(23);
    expect(getReelKeySeekTarget('ArrowUp', 10, 23)).toBeNull();
    expect(getReelKeySeekTarget('ArrowDown', 10, 23)).toBeNull();
    expect(getReelKeySeekTarget('Enter', 10, 23)).toBeNull();
  });

  it('video chưa có độ dài thì không tua quá 0', () => {
    expect(getReelKeySeekTarget('ArrowRight', 0, Number.NaN)).toBe(0);
  });
});

describe('canStepToNextReel', () => {
  it('bài kế tiếp đã có hình thì sang ngay', () => {
    expect(canStepToNextReel({ isNextReady: true, blockedSinceMs: null, nowMs: 0 })).toBe(true);
  });

  it('bài kế tiếp chưa có hình thì chặn, nhưng chặn quá 3 giây thì cho sang để không kẹt (Safari không tải trước)', () => {
    expect(canStepToNextReel({ isNextReady: false, blockedSinceMs: null, nowMs: 1_000 })).toBe(false);
    expect(canStepToNextReel({ isNextReady: false, blockedSinceMs: 1_000, nowMs: 2_500 })).toBe(false);
    expect(
      canStepToNextReel({ isNextReady: false, blockedSinceMs: 1_000, nowMs: 1_000 + REEL_NEXT_NOT_READY_BLOCK_MS }),
    ).toBe(true);
  });
});

describe('pruneReadyReelIds', () => {
  const ids = Array.from({ length: 10 }, (_, index) => `p${index}`);

  it('bài rời cửa sổ video (đã nhả nguồn) rồi quay lại thì không còn được coi là có hình (lỗi cũ: lướt vào vòng chờ)', () => {
    // Đang xem p5: p4..p7 có video và đều đã có hình.
    let ready = new Set(['p4', 'p5', 'p6', 'p7']);
    // Lướt lui về p2: cửa sổ video là p1..p4, p5..p7 bị gỡ thẻ video.
    ready = pruneReadyReelIds(ready, ids, 2);
    expect([...ready]).toEqual(['p4']);
    // Lướt tới p4: p5 lại là bài kế tiếp nhưng đang tải lại, chưa có hình nên phải bị chặn.
    ready = pruneReadyReelIds(ready, ids, 4);
    expect(ready.has('p5')).toBe(false);
    expect(canStepToNextReel({ isNextReady: ready.has('p5'), blockedSinceMs: null, nowMs: 0 })).toBe(false);
  });

  it('bài còn trong cửa sổ video giữ trạng thái đã có hình', () => {
    const ready = pruneReadyReelIds(new Set(['p2', 'p3', 'p4', 'p5']), ids, 3);
    expect(ready).toEqual(new Set(['p2', 'p3', 'p4', 'p5']));
  });

  it('bài bị bỏ khỏi danh sách (bỏ lưu) cũng bị bỏ; không sửa Set cũ', () => {
    const before = new Set(['p3', 'p4']);
    const ready = pruneReadyReelIds(before, ids.filter((id) => id !== 'p4'), 3);
    expect(ready).toEqual(new Set(['p3']));
    expect(before).toEqual(new Set(['p3', 'p4']));
  });
});

describe('getReelBufferSeconds', () => {
  it('bài đang xem đệm 30 giây, bài phía trước 10 giây, bài phía sau gần như không tải thêm', () => {
    expect(getReelBufferSeconds(5, 5)).toBe(REEL_CURRENT_BUFFER_SECONDS);
    expect(getReelBufferSeconds(6, 5)).toBe(REEL_AHEAD_BUFFER_SECONDS);
    expect(getReelBufferSeconds(7, 5)).toBe(REEL_AHEAD_BUFFER_SECONDS);
    expect(getReelBufferSeconds(4, 5)).toBe(REEL_BEHIND_BUFFER_SECONDS);
    // Bài thứ 2 phía sau (vẫn có thẻ video) cũng chỉ giữ bộ đệm, không về mức của bài đang xem hay phía trước.
    expect(getReelBufferSeconds(3, 5)).toBe(REEL_BEHIND_BUFFER_SECONDS);
    expect(getReelRenderMode(3, 5)).toBe('video');
    expect(REEL_AHEAD_BUFFER_SECONDS).toBeLessThan(REEL_CURRENT_BUFFER_SECONDS);
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

  it('bảng tin có bài lặp giữa các trang thì chỉ giữ lần đầu (không trùng key)', () => {
    expect(prependPinnedReelCards([], [card('a'), card('b'), card('a'), card('c'), card('b')]).map((c) => c.postId)).toEqual(['a', 'b', 'c']);
    expect(prependPinnedReelCards([card('b')], [card('a'), card('a'), card('b')]).map((c) => c.postId)).toEqual(['b', 'a']);
  });

  it('không có Reel ghim (link hỏng, bài bị ẩn) thì là bảng tin như thường', () => {
    expect(prependPinnedReelCards([], [card('a'), card('c')]).map((c) => c.postId)).toEqual(['a', 'c']);
  });
});

describe('computeReelEngagement & reuseReelEngagement', () => {
  it('tính đúng số đếm theo chi tiết bài viết và trạng thái lạc quan khi bấm tim/lưu', () => {
    const post = toReelPost(card);
    expect(
      computeReelEngagement({
        post,
        serverLiked: false,
        serverSaved: false,
        optimisticLiked: true,
      }),
    ).toEqual({
      isLiked: true,
      isSaved: false,
      likes: 6,
      saves: 3,
      comments: 4,
      shares: 2,
    });

    expect(
      computeReelEngagement({
        post,
        detailPost: {
          reactionTotal: 10,
          bookmarkCount: 7,
          commentCount: 9,
          shareCount: 1,
        },
        serverLiked: true,
        serverSaved: true,
        optimisticLiked: false,
      }),
    ).toEqual({
      isLiked: false,
      isSaved: true,
      likes: 9,
      saves: 7,
      comments: 9,
      shares: 1,
    });
  });

  it('giữ nguyên tham chiếu object ReelEngagement khi cả 6 giá trị chưa đổi; chỉ đổi bài bị bấm', () => {
    const cache = new Map<string, ReturnType<typeof computeReelEngagement>>();
    const firstP1 = reuseReelEngagement(cache, 'p1', {
      isLiked: false,
      isSaved: false,
      likes: 5,
      saves: 3,
      comments: 4,
      shares: 2,
    });
    const firstP2 = reuseReelEngagement(cache, 'p2', {
      isLiked: false,
      isSaved: false,
      likes: 8,
      saves: 1,
      comments: 2,
      shares: 0,
    });

    const likedP1 = reuseReelEngagement(cache, 'p1', {
      isLiked: true,
      isSaved: false,
      likes: 6,
      saves: 3,
      comments: 4,
      shares: 2,
    });
    const sameP2 = reuseReelEngagement(cache, 'p2', {
      isLiked: false,
      isSaved: false,
      likes: 8,
      saves: 1,
      comments: 2,
      shares: 0,
    });

    expect(likedP1).not.toBe(firstP1);
    expect(sameP2).toBe(firstP2);
  });
});


describe('startReelOnPostChange', () => {
  it('keeps playback position and does not replay on mute changes, but restarts on a new post', () => {
    const video = { currentTime: 12, muted: true };
    const play = vi.fn();
    video.muted = false;
    startReelOnPostChange(video, 'post-1', 'post-1', play);
    expect(video.currentTime).toBe(12);
    expect(play).not.toHaveBeenCalled();
    video.muted = true;
    startReelOnPostChange(video, 'post-1', 'post-1', play);
    expect(video.currentTime).toBe(12);
    expect(play).not.toHaveBeenCalled();
    startReelOnPostChange(video, 'post-1', 'post-2', play);
    expect(video.currentTime).toBe(0);
    expect(play).toHaveBeenCalledOnce();
  });

  it('starts a new post without seeking if already at the beginning', () => {
    const video = { currentTime: 0.05 };
    const play = vi.fn();
    startReelOnPostChange(video, undefined, 'post-1', play);
    expect(video.currentTime).toBe(0.05);
    expect(play).toHaveBeenCalledOnce();
  });
});
