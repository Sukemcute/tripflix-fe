import { describe, expect, it } from 'vitest';
import { shouldShowTripPlanSkeleton } from './trip-plan-gate';

describe('shouldShowTripPlanSkeleton', () => {
  it('có bài (kể cả từ prefetch lúc phiên chưa sẵn sàng) thì không hiện skeleton', () => {
    expect(shouldShowTripPlanSkeleton({ hasPost: true, isReady: false, isPending: false })).toBe(false);
  });

  it('chưa có bài và phiên chưa sẵn sàng thì vẫn hiện skeleton', () => {
    expect(shouldShowTripPlanSkeleton({ hasPost: false, isReady: false, isPending: true })).toBe(true);
  });

  it('chưa có bài nhưng đang tải thì hiện skeleton', () => {
    expect(shouldShowTripPlanSkeleton({ hasPost: false, isReady: true, isPending: true })).toBe(true);
  });

  it('phiên đã sẵn sàng và đã có bài thì hiển thị nội dung', () => {
    expect(shouldShowTripPlanSkeleton({ hasPost: true, isReady: true, isPending: false })).toBe(false);
  });

  it('phiên đã sẵn sàng, không có bài và không đang tải thì không skeleton (trang báo không tìm thấy)', () => {
    expect(shouldShowTripPlanSkeleton({ hasPost: false, isReady: true, isPending: false })).toBe(false);
  });
});
