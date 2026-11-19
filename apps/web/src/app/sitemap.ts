import { seoApi } from '@tripflix/api-client/seo';
import type { MetadataRoute } from 'next';
import { collectSitemapEntries } from '@/features/seo/sitemap-entries';
import { getServerApiUrl, toAbsoluteUrl } from '@/lib/site';

// Dựng lại mỗi lần crawler đọc: lúc build image Docker chưa có API, bản dựng sẵn sẽ chỉ có trang cố định (TF112).
export const dynamic = 'force-dynamic';

const PAGE_TIMEOUT_MS = 5_000;

const request = () => ({ baseUrl: getServerApiUrl(), signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return collectSitemapEntries(
    (cursor) => seoApi.listPosts(cursor, request()),
    (userId) => seoApi.getProfile(userId, request()).then(() => true),
    toAbsoluteUrl,
  );
}
