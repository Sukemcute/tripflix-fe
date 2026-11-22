import { describe, expect, it } from 'vitest';
import { nextScrollTarget, stepScrollTowards, wheelDeltaToPixels } from './smooth-wheel-scroll';

describe('wheelDeltaToPixels', () => {
  it('giữ nguyên pixel, đổi dòng và trang ra pixel', () => {
    expect(wheelDeltaToPixels(100, 0, 800)).toBe(100);
    expect(wheelDeltaToPixels(3, 1, 800)).toBe(120);
    expect(wheelDeltaToPixels(1, 2, 800)).toBe(800);
  });
});

describe('nextScrollTarget', () => {
  it('lần lăn đầu tính từ vị trí hiện tại', () => {
    expect(nextScrollTarget({ pendingTarget: null, scrollTop: 200, delta: 100, maxScroll: 1000 })).toBe(300);
  });

  it('lăn liên tục cộng dồn vào đích đang chạy dở, không hụt quãng', () => {
    expect(nextScrollTarget({ pendingTarget: 300, scrollTop: 240, delta: 100, maxScroll: 1000 })).toBe(400);
  });

  it('không vượt quá đầu và cuối danh sách', () => {
    expect(nextScrollTarget({ pendingTarget: null, scrollTop: 50, delta: -200, maxScroll: 1000 })).toBe(0);
    expect(nextScrollTarget({ pendingTarget: 950, scrollTop: 900, delta: 200, maxScroll: 1000 })).toBe(1000);
  });
});

describe('stepScrollTowards', () => {
  it('tiến dần về đích, càng gần càng chậm', () => {
    const first = stepScrollTowards(0, 100)!;
    const second = stepScrollTowards(first, 100)!;
    expect(first).toBeGreaterThan(0);
    expect(second - first).toBeLessThan(first);
    expect(second).toBeLessThan(100);
  });

  it('tới đích thì dừng', () => {
    expect(stepScrollTowards(99.8, 100)).toBeNull();
  });
});
