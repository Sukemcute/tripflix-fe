import { describe, expect, it } from 'vitest';
import {
  fitReelVideo,
  getCollapsedCaptionLength,
  getReelCommentsSheetHeight,
  getReelPosterPrefetchUrls,
  getReelResolutionCap,
  getReelScale,
  getSwipedTabIndex,
  getReelPlayerIndexes,
  layoutReelCommentsVideo,
  layoutReelVideo,
  selectReelPoster,
  isBackSwipeComplete,
} from './reels';

describe('reels playback policy', () => {
  it('phủ kín màn hình cao với video dọc, giữ toàn khung với trường hợp còn lại', () => {
    expect(layoutReelVideo('9:16', 360, 800)).toEqual({
      box: { width: 360, height: 800 },
      contentFit: 'cover',
    });
    expect(layoutReelVideo('9:16', 720, 640)).toEqual({
      box: { width: 360, height: 640 },
      contentFit: 'contain',
    });
    expect(layoutReelVideo('16:9', 360, 800)).toEqual({
      box: { width: 360, height: 202.5 },
      contentFit: 'contain',
    });
    expect(layoutReelVideo('1:1', 360, 800)).toEqual({
      box: { width: 360, height: 360 },
      contentFit: 'contain',
    });
  });

  it('phủ kín video dọc trên các máy phổ biến, chỉ chừa nền mờ khi khung quá thấp', () => {
    // Khung reel = màn hình trừ thanh tab 44pt: 20:9, iPhone SE, iPhone 15, Pro Max, khung trình duyệt.
    for (const [width, height] of [
      [360, 756],
      [375, 623],
      [390, 800],
      [430, 888],
      [536, 873],
    ] as const) {
      expect(layoutReelVideo('9:16', width, height)).toEqual({ box: { width, height }, contentFit: 'cover' });
    }
    // Máy tính bảng: cắt 28% chiều cao là mất nội dung, giữ toàn khung.
    expect(layoutReelVideo('9:16', 768, 980).contentFit).toBe('contain');
  });

  it('co giãn icon theo bề ngang, chặn ở 0.85 và 1.15', () => {
    expect(getReelScale(390)).toBe(1);
    expect(getReelScale(360)).toBeCloseTo(360 / 390);
    expect(getReelScale(300)).toBe(0.85);
    expect(getReelScale(600)).toBe(1.15);
  });

  it('giữ toàn khung video dọc, ngang và vuông trong màn hình', () => {
    expect(fitReelVideo('9:16', 360, 800)).toEqual({ width: 360, height: 640 });
    expect(fitReelVideo('16:9', 360, 800)).toEqual({ width: 360, height: 202.5 });
    expect(fitReelVideo('1:1', 360, 800)).toEqual({ width: 360, height: 360 });
    expect(fitReelVideo('9:16', 720, 640)).toEqual({ width: 360, height: 640 });
  });
  it('chọn ảnh nhỏ nhất đủ chiều rộng và dùng bản lớn nhất khi màn rộng hơn 720', () => {
    const posters = { w360: 'small', w540: 'medium', w720: 'large' };
    expect([320, 360, 361, 540, 541, 1080].map((width) => selectReelPoster(posters, width))).toEqual([
      'small',
      'small',
      'medium',
      'medium',
      'large',
      'large',
    ]);
  });

  it('giữ đúng bài trước, hiện tại và sau khi vuốt xuôi, ngược hoặc nhảy xa', () => {
    for (const active of [0, 1, 2, 6, 5, 2, 9]) {
      const indexes = getReelPlayerIndexes(10, active).filter((index) => index !== null);
      expect(new Set(indexes).size).toBe(indexes.length);
      expect(indexes).toContain(active);
      expect(indexes.every((index) => Math.abs(index - active) <= 1)).toBe(true);
      expect(indexes).toHaveLength(active === 0 || active === 9 ? 2 : 3);
    }
    expect(getReelPlayerIndexes(0, 0)).toEqual([null, null, null]);
    expect(getReelPlayerIndexes(1, 0)).toEqual([0, null, null]);
  });

  it('chỉ cắt caption dài hơn số dòng cho phép và chừa chỗ cho chữ nối', () => {
    expect(getCollapsedCaptionLength(['một dòng'], 2, 5)).toBeNull();
    expect(getCollapsedCaptionLength(['aaaa', 'bbbb'], 2, 2)).toBeNull();
    expect(getCollapsedCaptionLength(['aaaa', 'bbbb', 'cc'], 2, 3)).toBe(5);
    expect(getCollapsedCaptionLength(['a', 'b', 'c'], 2, 10)).toBe(0);
  });

  it('đổi tab khi vuốt đủ xa hoặc đủ nhanh, không vượt quá tab đầu và cuối', () => {
    const swipe = (currentIndex: number, translationX: number, velocityX: number) =>
      getSwipedTabIndex({ currentIndex, tabCount: 3, translationX, velocityX, width: 400 });
    expect(swipe(1, -101, 0)).toBe(2);
    expect(swipe(1, 101, 0)).toBe(0);
    expect(swipe(1, -100, 0)).toBe(1);
    expect(swipe(1, -20, -600)).toBe(2);
    expect(swipe(1, -200, 600)).toBe(1);
    expect(swipe(0, 300, 0)).toBe(0);
    expect(swipe(2, -300, -900)).toBe(2);
  });

  it('chỉ lấy ảnh bìa của các video phía sau, đúng cỡ và bỏ ảnh rỗng', () => {
    const posters = (id: string) => ({ w360: `${id}-360`, w540: `${id}-540`, w720: `${id}-720` });
    const sets = ['a', 'b', 'c', 'd', 'e'].map(posters);
    expect(getReelPosterPrefetchUrls(sets, 0, 400)).toEqual(['b-540', 'c-540', 'd-540']);
    expect(getReelPosterPrefetchUrls(sets, 3, 300)).toEqual(['e-360']);
    expect(getReelPosterPrefetchUrls(sets, 4, 400)).toEqual([]);
    expect(getReelPosterPrefetchUrls([posters('a'), { w360: '', w540: '', w720: '' }], 0, 400)).toEqual([]);
  });

  it('thu video đúng tỷ lệ và căn giữa phía trên khung bình luận', () => {
    expect(getReelCommentsSheetHeight(800)).toBe(544);
    expect(getReelCommentsSheetHeight(1200)).toBe(680);
    const viewport = { windowHeight: 800, slideWidth: 390, topInset: 40 };
    const portrait = layoutReelCommentsVideo({ ...viewport, aspect: '9:16' });
    expect(portrait).toEqual({ width: 121.5, height: 216, left: 134.25, top: 40 });
    const landscape = layoutReelCommentsVideo({ ...viewport, aspect: '16:9' });
    expect(landscape.width / landscape.height).toBeCloseTo(16 / 9);
    expect(landscape.left + landscape.width / 2).toBe(195);
    expect(landscape.top + landscape.height / 2).toBe(148);
    expect(layoutReelCommentsVideo({ ...viewport, aspect: '1:1', windowHeight: 80 }).height).toBe(0);
  });

  it('giới hạn 540p theo đúng chiều cho video dọc, ngang và vuông', () => {
    expect(getReelResolutionCap('9:16')).toEqual({ width: 540, height: 960 });
    expect(getReelResolutionCap('16:9')).toEqual({ width: 960, height: 540 });
    expect(getReelResolutionCap('1:1')).toEqual({ width: 540, height: 540 });
  });
});

describe('isBackSwipeComplete', () => {
  it('leaves after a long enough swipe in either direction', () => {
    expect(isBackSwipeComplete({ translationX: -81, velocityX: 0 })).toBe(true);
    expect(isBackSwipeComplete({ translationX: 81, velocityX: 0 })).toBe(true);
  });

  it('leaves on a short flick', () => {
    expect(isBackSwipeComplete({ translationX: -30, velocityX: -900 })).toBe(true);
  });

  it('stays after a small drag or a tiny flick', () => {
    expect(isBackSwipeComplete({ translationX: -60, velocityX: -100 })).toBe(false);
    expect(isBackSwipeComplete({ translationX: -10, velocityX: -900 })).toBe(false);
  });

  it('stays when the finger flicks back the other way', () => {
    expect(isBackSwipeComplete({ translationX: -60, velocityX: 900 })).toBe(false);
  });
});
