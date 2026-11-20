import { QueryClient, hydrate } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { tripPlanPostQueryKey } from '@tripflix/api-client/profile-query-keys';
import { createTripPlanHydrationState } from './trip-plan-hydration';
import { makePost } from './seo-fixtures';

const detail = {
  post: makePost({ id: 'p1' }),
  viewerContext: { myReaction: null } as never,
  shareUrl: 'https://tripflix.io.vn/trip-plans/p1',
};

function readOnClient(state: ReturnType<typeof createTripPlanHydrationState>, userId?: string) {
  const client = new QueryClient();
  hydrate(client, state);
  return client.getQueryData(tripPlanPostQueryKey('p1', userId));
}

describe('createTripPlanHydrationState', () => {
  it('đặt chi tiết bài dưới khoá ẩn danh, đúng hình dạng socialApi.getPost', () => {
    expect(readOnClient(createTripPlanHydrationState('p1', detail))).toEqual(detail);
  });

  it('không dùng chung cho người đã đăng nhập, để không đọc nhầm trạng thái thả tim/lưu của người khác', () => {
    expect(readOnClient(createTripPlanHydrationState('p1', detail), 'user-1')).toBeUndefined();
  });

  it('bỏ qua khi chi tiết null (lỗi, timeout, bài held/private)', () => {
    expect(readOnClient(createTripPlanHydrationState('p1', null))).toBeUndefined();
  });
});
