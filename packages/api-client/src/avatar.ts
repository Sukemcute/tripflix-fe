import { getUserSearchControllerAvatarUrl } from './generated/core-api/users/users';
import { getHttpConfig } from './http';

/** Link ảnh đại diện của một người (TF109): BE chuyển hướng 302 tới ảnh, 404 khi chưa có ảnh. */
export function getAvatarUrl(userId: string): string {
  return `${getHttpConfig().baseUrl.replace(/\/$/, '')}${getUserSearchControllerAvatarUrl(userId)}`;
}
