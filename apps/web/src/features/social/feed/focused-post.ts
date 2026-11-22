import type { SocialPostDetailDto, SocialPostDto } from '@tripflix/api-client/core-api/model/index';

/** Bài mở từ link có thể không nằm trong feed gợi ý; ghim một bản, giữ nguyên thứ tự các bài còn lại. */
export function getFocusedFeedPosts({
  posts,
  focusPostId,
  detail,
  hasError,
}: {
  posts: SocialPostDto[];
  focusPostId: string | null;
  detail?: SocialPostDetailDto;
  hasError: boolean;
}): SocialPostDto[] {
  if (!focusPostId) return posts;
  // Không dùng dữ liệu cũ khi đổi link, mất quyền xem hoặc bài không thuộc tab Bài viết.
  if (hasError || detail?.post.id !== focusPostId || detail.post.postType !== 'vlog') return [];
  return [
    { ...detail.post, viewerContext: detail.viewerContext },
    ...posts.filter((post) => post.id !== focusPostId),
  ];
}
