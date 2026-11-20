// Khoá cache của hồ sơ công khai, tách khỏi các hook React để trang server (TF113) dùng được
// mà không kéo theo React Query client. Phải giữ đúng giá trị mà public-profile.ts đang dùng.
export const publicProfileQueryKey = (userId: string | undefined) => ['social', 'profile', userId] as const;

export const authorVlogsQueryKey = (userId: string | undefined) =>
  ['social', 'author', userId, 'vlog'] as const;

// Chi tiết bài lộ trình. Có user trong khoá nên người đã đăng nhập không đọc nhầm dữ liệu ẩn danh (TF113).
export const tripPlanPostQueryKey = (postId: string, userId: string | undefined) =>
  ['social', 'post', postId, userId] as const;
