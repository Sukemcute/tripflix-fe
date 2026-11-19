import { seoApi } from '@tripflix/api-client/seo';
import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { collectSitemapEntries } from '@/features/seo/sitemap-entries';
import { getServerApiUrl, toAbsoluteUrl } from '@/lib/site';

// Route dynamic vì lúc build image Docker chưa có API; kết quả đầy đủ được cache 1 giờ để crawler
// đọc nhiều lần không kéo API mỗi lần (TF112).
export const dynamic = 'force-dynamic';

const REQUEST_TIMEOUT_MS = 3_000;
const SITEMAP_CACHE_SECONDS = 60 * 60;

const request = () => ({ baseUrl: getServerApiUrl(), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

/** Kết quả thiếu do API lỗi: ném ra để unstable_cache không lưu, nhưng vẫn mang danh sách đã đọc được. */
class IncompleteSitemapError extends Error {
  constructor(readonly entries: MetadataRoute.Sitemap) {
    super('Sitemap is incomplete');
  }
}

const buildCompleteSitemap = unstable_cache(
  async () => {
    const result = await collectSitemapEntries(
      (cursor) => seoApi.listPosts(cursor, request()),
      (userId) =>
        seoApi.getProfile(userId, request()).then(
          () => true,
          (error: unknown) => {
            // 404: tác giả không có hồ sơ công khai. Lỗi khác ném tiếp để đánh dấu kết quả thiếu.
            if (typeof error === 'object' && error && 'status' in error && error.status === 404) return false;
            throw error;
          },
        ),
      toAbsoluteUrl,
    );
    if (!result.isComplete) throw new IncompleteSitemapError(result.entries);
    return result.entries;
  },
  ['seo-sitemap-v1'],
  { revalidate: SITEMAP_CACHE_SECONDS, tags: ['seo-sitemap'] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await buildCompleteSitemap();
  } catch (error) {
    if (error instanceof IncompleteSitemapError) return error.entries;
    throw error;
  }
}
