import { authorVlogsQueryKey, publicProfileQueryKey } from '@tripflix/api-client/profile-query-keys';
import type { PublicProfileDto, SocialPostPageDto } from '@tripflix/api-client/core-api/model/index';
import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';

/**
 * Trạng thái React Query cho trang hồ sơ, dựng từ dữ liệu ẩn danh ở server (TF113).
 * Khoá trùng với khoá client dùng; khi người xem đã đăng nhập, khoá có user thay đổi nên client tự tải lại.
 * Trường hợp dữ liệu null (lỗi, timeout, 404) thì bỏ qua, client tải như cũ.
 */
export function createProfileHydrationState(
  userId: string,
  profile: PublicProfileDto | null,
  vlogs: SocialPostPageDto | null,
): DehydratedState {
  const client = new QueryClient();
  if (profile) client.setQueryData(publicProfileQueryKey(userId), profile);
  if (vlogs) client.setQueryData(authorVlogsQueryKey(userId), { pages: [vlogs], pageParams: [undefined] });
  return dehydrate(client);
}
