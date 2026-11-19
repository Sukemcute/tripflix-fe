import { postsControllerListPublicPosts } from '@tripflix/api-client/core-api/social-posts/social-posts';
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

export const findPublicPost = cache((postId: string) =>
  readOrNull((signal) => seoApi.getPost(postId, { baseUrl: getServerApiUrl(), signal })),
);

export const findPublicProfile = cache((userId: string) =>
  readOrNull((signal) => seoApi.getProfile(userId, { baseUrl: getServerApiUrl(), signal })),
);

/** Kiểm tra ẩn danh xem tác giả có ít nhất 1 bài công khai hay không (limit=1); lỗi/timeout trả null để fail-safe noindex (TF25). */
export const hasPublicProfilePosts = cache((userId: string) =>
  readOrNull(async (signal) => {
    const response = await postsControllerListPublicPosts(
      { author_id: userId, limit: 1 },
      {
        baseUrl: getServerApiUrl(),
        signal,
        skipAuthorization: true,
        skipAuthRefresh: true,
      },
    );
    const items = response?.data?.items;
    if (!Array.isArray(items)) return null;
    return items.some((post) => post.visibility === 'public' && post.status === 'published' && !post.deletedAt);
  }),
);
