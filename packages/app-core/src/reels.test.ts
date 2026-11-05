import { describe, expect, it } from 'vitest';
import { fitReelVideo, getReelResolutionCap, getReelPlayerIndexes, selectReelPoster } from './reels';

describe('reels playback policy', () => {
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

  it('giới hạn 540p theo đúng chiều cho video dọc, ngang và vuông', () => {
    expect(getReelResolutionCap('9:16')).toEqual({ width: 540, height: 960 });
    expect(getReelResolutionCap('16:9')).toEqual({ width: 960, height: 540 });
    expect(getReelResolutionCap('1:1')).toEqual({ width: 540, height: 540 });
  });
});
