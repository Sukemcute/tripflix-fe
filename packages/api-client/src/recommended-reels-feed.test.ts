import { describe, expect, it, vi } from 'vitest';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRecommendedReelsFeed } from './feed';

const { KEEP_PREVIOUS_DATA } = vi.hoisted(() => ({ KEEP_PREVIOUS_DATA: Symbol('keepPreviousData') }));

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: KEEP_PREVIOUS_DATA,
  useInfiniteQuery: vi.fn().mockReturnValue({}),
}));

vi.mock('./reset-on-return', () => ({ useResetOnReturn: vi.fn() }));

vi.mock('./session', () => ({
  useApiSession: vi.fn().mockReturnValue({ isReady: true, user: null }),
}));

describe('useRecommendedReelsFeed', () => {
  it('giữ danh sách cũ khi đổi kiểu gợi ý, để khung Reels không bị thay bằng dấu chờ', () => {
    useRecommendedReelsFeed({ mode: 'has_plan' });
    const options = vi.mocked(useInfiniteQuery).mock.calls.at(-1)![0] as unknown as { queryKey: unknown[]; placeholderData: unknown };
    expect(options.queryKey).toContain('has_plan');
    expect(options.placeholderData).toBe(KEEP_PREVIOUS_DATA);
  });
});
