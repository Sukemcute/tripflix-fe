import type { SocialPostDto, SocialPostPageDto } from '@tripflix/api-client/core-api/model/index';
import type { MetadataRoute } from 'next';
import { hotelPath, profilePath, tripPlanPath } from './page-metadata';

type SitemapEntry = MetadataRoute.Sitemap[number];

/** Trang công khai cố định. Trang tìm kiếm, đăng nhập và trang riêng của người dùng không đưa vào. */
export const STATIC_SITEMAP_PATHS: ReadonlyArray<{ path: string; priority: number }> = [
  { path: '/', priority: 1 },
  { path: '/inspiration', priority: 0.8 },
  { path: '/flights', priority: 0.6 },
  { path: '/dieu-khoan-su-dung', priority: 0.2 },
  { path: '/chinh-sach-bao-mat', priority: 0.2 },
];

/** Số trang bài tối đa đọc cho một lần dựng sitemap (50 bài/trang), để crawler không kéo API quá lâu. */
export const MAX_POST_PAGES = 20;

/** Số hồ sơ tác giả tối đa kiểm tra cho một lần dựng sitemap. */
export const MAX_PROFILE_CHECKS = 100;

/** Số request kiểm tra hồ sơ chạy cùng lúc, để một lần dựng sitemap không dồn tải lên API. */
export const PROFILE_CHECK_CONCURRENCY = 4;

export interface SitemapResult {
  entries: MetadataRoute.Sitemap;
  /** false khi có lần gọi API lỗi: kết quả thiếu, không nên cache. */
  isComplete: boolean;
}

export type LoadPostPage = (cursor: string | undefined) => Promise<SocialPostPageDto>;
/** Trả true khi hồ sơ công khai mở được; tác giả của dữ liệu mẫu có thể không có tài khoản thật. */
export type HasPublicProfile = (userId: string) => Promise<boolean>;

/** Chạy `task` cho từng phần tử, tối đa `limit` việc cùng lúc, giữ đúng thứ tự kết quả. */
export async function mapWithConcurrency<Input, Output>(
  inputs: readonly Input[],
  limit: number,
  task: (input: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = new Array<Output>(inputs.length);
  let next = 0;
  const worker = async () => {
    while (next < inputs.length) {
      const index = next;
      next += 1;
      results[index] = await task(inputs[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, inputs.length) }, worker));
  return results;
}

function laterDate(current: Date | undefined, value: string | null | undefined): Date | undefined {
  if (!value) return current;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return current;
  return !current || date > current ? date : current;
}

/**
 * Dựng sitemap từ trang cố định và bài công khai: lộ trình của bài có chuyến đi, khách sạn trong chuyến đi,
 * hồ sơ tác giả. Lỗi API giữa chừng thì giữ phần đã đọc được và báo `isComplete: false`.
 */
export async function collectSitemapEntries(
  loadPostPage: LoadPostPage,
  hasPublicProfile: HasPublicProfile,
  toAbsoluteUrl: (path: string) => string,
): Promise<SitemapResult> {
  let isComplete = true;
  const tripPlans = new Map<string, Date | undefined>();
  const hotels = new Map<string, Date | undefined>();
  const profiles = new Map<string, Date | undefined>();
  const remember = (map: Map<string, Date | undefined>, key: string, post: SocialPostDto) =>
    map.set(key, laterDate(map.get(key), post.updatedAt ?? post.publishedAt));

  let cursor: string | undefined;
  for (let page = 0; page < MAX_POST_PAGES; page += 1) {
    let postPage: SocialPostPageDto;
    try {
      postPage = await loadPostPage(cursor);
    } catch {
      isComplete = false;
      break;
    }
    for (const post of postPage.items) {
      if (post.visibility !== 'public' || post.status !== 'published' || post.deletedAt) continue;
      remember(profiles, post.authorId, post);
      if (!post.tripAttachment) continue;
      remember(tripPlans, post.id, post);
      if (post.tripAttachment.hotelId) remember(hotels, post.tripAttachment.hotelId, post);
    }
    if (!postPage.hasMore || !postPage.nextCursor) break;
    cursor = postPage.nextCursor;
  }

  // Chỉ đưa hồ sơ mở được vào sitemap, để không chỉ máy tìm kiếm tới trang 404.
  const authorIds = [...profiles.keys()];
  const checkedIds = authorIds.slice(0, MAX_PROFILE_CHECKS);
  const reachable = await mapWithConcurrency(checkedIds, PROFILE_CHECK_CONCURRENCY, (userId) =>
    hasPublicProfile(userId).catch(() => {
      isComplete = false;
      return false;
    }),
  );
  authorIds.forEach((userId, index) => {
    if (!reachable[index]) profiles.delete(userId);
  });

  const toEntries = (
    map: Map<string, Date | undefined>,
    toPath: (id: string) => string,
    priority: number,
  ): SitemapEntry[] =>
    [...map].map(([id, lastModified]) => ({
      url: toAbsoluteUrl(toPath(id)),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly',
      priority,
    }));

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_SITEMAP_PATHS.map(({ path, priority }) => ({
      url: toAbsoluteUrl(path),
      changeFrequency: 'daily' as const,
      priority,
    })),
    ...toEntries(hotels, hotelPath, 0.8),
    ...toEntries(tripPlans, tripPlanPath, 0.7),
    ...toEntries(profiles, profilePath, 0.4),
  ];
  return { entries, isComplete };
}
