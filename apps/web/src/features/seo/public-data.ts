import { seoApi } from '@tripflix/api-client/seo';
import { cache } from 'react';
import { getServerApiUrl } from '../../lib/site';

// Dữ liệu công khai cho metadata và JSON-LD. React cache gộp lần gọi của generateMetadata và trang
// trong cùng một request; lỗi API trả null để trang vẫn render với metadata chung (TF112).
// Timeout ngắn vì metadata và JSON-LD nằm trên đường render của trang.
export const LOOKUP_TIMEOUT_MS = 2_000;

async function readOrNull<T>(load: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  try {
    return await load(AbortSignal.timeout(LOOKUP_TIMEOUT_MS));
  } catch {
    return null;
  }
}

export const findPublicHotel = cache((slug: string) =>
  readOrNull((signal) => seoApi.getHotel(slug, { baseUrl: getServerApiUrl(), signal })),
);

/** Chi tiết bài (post, viewerContext, shareUrl). Metadata và prefetch trang lộ trình dùng chung một lần gọi (TF113). */
export const findPublicPostDetail = cache((postId: string) =>
  readOrNull((signal) => seoApi.getPostDetail(postId, { baseUrl: getServerApiUrl(), signal })),
);

export const findPublicPost = cache(
  async (postId: string) => (await findPublicPostDetail(postId))?.post ?? null,
);

export const findPublicProfile = cache((userId: string) =>
  readOrNull((signal) => seoApi.getProfile(userId, { baseUrl: getServerApiUrl(), signal })),
);

/** Trang 1 vlog của tác giả, đưa vào cache React Query trước khi render hồ sơ (TF113). */
export const findPublicAuthorVlogs = cache((userId: string) =>
  readOrNull((signal) => seoApi.listAuthorVlogs(userId, { baseUrl: getServerApiUrl(), signal })),
);

/**
 * Tác giả có bài hoặc Reels công khai nào không (ẩn danh). Lỗi hoặc timeout trả null để trang noindex an toàn (TF25).
 * Việc đọc API nằm trong seoApi.hasPublicContent.
 */
export const hasPublicProfilePosts = cache((userId: string) =>
  readOrNull((signal) => seoApi.hasPublicContent(userId, { baseUrl: getServerApiUrl(), signal })),
);
