import { tripPlanPostQueryKey } from '@tripflix/api-client/profile-query-keys';
import type { SocialPostDetailDto } from '@tripflix/api-client/core-api/model/index';
import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';

/**
 * Trạng thái React Query cho trang lộ trình, dựng từ chi tiết bài ẩn danh ở server (TF113).
 * Khoá dùng user undefined, khớp với lần tải đầu của người chưa đăng nhập. Người đã đăng nhập có khoá khác
 * nên tải lại ở client. Chi tiết null (lỗi, timeout, bài held/private) thì bỏ qua.
 */
export function createTripPlanHydrationState(
  postId: string,
  detail: SocialPostDetailDto | null,
): DehydratedState {
  const client = new QueryClient();
  if (detail) client.setQueryData(tripPlanPostQueryKey(postId, undefined), detail);
  return dehydrate(client);
}
