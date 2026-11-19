import type { SocialPostPageDto } from '@tripflix/api-client/core-api/model/index';
import { describe, expect, it, vi } from 'vitest';
import {
  collectSitemapEntries,
  mapWithConcurrency,
  MAX_POST_PAGES,
  PROFILE_CHECK_CONCURRENCY,
  STATIC_SITEMAP_PATHS,
} from './sitemap-entries';
import { makePost } from './seo-fixtures';

const absolute = (path: string) => `https://tripflix.io.vn${path}`;
const allProfiles = async () => true;
const page = (items: SocialPostPageDto['items'], nextCursor: string | null = null): SocialPostPageDto => ({
  items,
  nextCursor,
  hasMore: nextCursor !== null,
});

describe('collectSitemapEntries', () => {
  it('gồm trang cố định, khách sạn, lộ trình và hồ sơ tác giả, không trùng', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([makePost({ id: 'p1' })], 'c2'))
      .mockResolvedValueOnce(page([makePost({ id: 'p2', updatedAt: '2026-11-15T00:00:00.000Z' })]));
    const urls = (await collectSitemapEntries(load, allProfiles, absolute)).entries.map((entry) => entry.url);
    expect(load).toHaveBeenNthCalledWith(2, 'c2');
    expect(urls).toEqual([
      ...STATIC_SITEMAP_PATHS.map(({ path }) => absolute(path)),
      'https://tripflix.io.vn/hotels/vinpearl-resort-nha-trang',
      'https://tripflix.io.vn/trip-plans/p1',
      'https://tripflix.io.vn/trip-plans/p2',
      'https://tripflix.io.vn/u/user-1',
    ]);
  });

  it('lastModified của khách sạn lấy bài cập nhật mới nhất', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(
        page([
          makePost({ id: 'p1', updatedAt: '2026-11-12T00:00:00.000Z' }),
          makePost({ id: 'p2', updatedAt: '2026-11-18T00:00:00.000Z' }),
        ]),
      );
    const { entries } = await collectSitemapEntries(load, allProfiles, absolute);
    const hotel = entries.find((entry) => entry.url.includes('/hotels/'));
    expect(hotel?.lastModified).toEqual(new Date('2026-11-18T00:00:00.000Z'));
  });

  it('bỏ bài riêng tư, chưa đăng, đã xoá; bài không có chuyến đi chỉ đưa hồ sơ', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(
        page([
          makePost({ id: 'private', visibility: 'private', authorId: 'a1' }),
          makePost({ id: 'held', status: 'held', authorId: 'a2' }),
          makePost({ id: 'deleted', deletedAt: '2026-11-01T00:00:00.000Z', authorId: 'a3' }),
          makePost({ id: 'plain', tripAttachment: null, authorId: 'a4' }),
        ]),
      );
    const urls = (await collectSitemapEntries(load, allProfiles, absolute)).entries.map((entry) => entry.url);
    expect(urls.filter((url) => !STATIC_SITEMAP_PATHS.some(({ path }) => url === absolute(path)))).toEqual([
      'https://tripflix.io.vn/u/a4',
    ]);
  });

  it('API lỗi giữa chừng vẫn trả phần đã đọc', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([makePost({ id: 'p1' })], 'c2'))
      .mockRejectedValueOnce(new Error('HTTP 503'));
    const result = await collectSitemapEntries(load, allProfiles, absolute);
    expect(result.entries.map((entry) => entry.url)).toContain('https://tripflix.io.vn/trip-plans/p1');
    expect(result.isComplete).toBe(false);
  });

  it('dừng ở giới hạn số trang dù API còn trang sau', async () => {
    const load = vi.fn().mockImplementation(async (cursor?: string) => page([], `next-${cursor ?? 0}`));
    await collectSitemapEntries(load, allProfiles, absolute);
    expect(load).toHaveBeenCalledTimes(MAX_POST_PAGES);
  });
  it('bỏ hồ sơ tác giả không mở được hoặc kiểm tra bị lỗi', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(
        page([
          makePost({ id: 'p1', authorId: 'real' }),
          makePost({ id: 'p2', authorId: 'seed' }),
          makePost({ id: 'p3', authorId: 'flaky' }),
        ]),
      );
    const hasProfile = vi.fn(async (userId: string) => {
      if (userId === 'flaky') throw new Error('timeout');
      return userId === 'real';
    });
    const urls = (await collectSitemapEntries(load, hasProfile, absolute)).entries.map((entry) => entry.url);
    expect(urls.filter((url) => url.includes('/u/'))).toEqual(['https://tripflix.io.vn/u/real']);
    expect(hasProfile).toHaveBeenCalledTimes(3);
  });

  it('báo kết quả thiếu khi kiểm tra hồ sơ lỗi, đầy đủ khi mọi lần gọi thành công', async () => {
    const posts = page([makePost({ id: 'p1', authorId: 'a1' })]);
    const failing = await collectSitemapEntries(
      vi.fn().mockResolvedValueOnce(posts),
      async () => {
        throw new Error('timeout');
      },
      absolute,
    );
    expect(failing.isComplete).toBe(false);
    const complete = await collectSitemapEntries(vi.fn().mockResolvedValueOnce(posts), allProfiles, absolute);
    expect(complete.isComplete).toBe(true);
  });

  it('kiểm tra hồ sơ không vượt quá số request song song cho phép', async () => {
    const authors = Array.from({ length: 12 }, (_, index) =>
      makePost({ id: `p${index}`, authorId: `a${index}` }),
    );
    let running = 0;
    let peak = 0;
    const hasProfile = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return true;
    };
    const { entries } = await collectSitemapEntries(
      vi.fn().mockResolvedValueOnce(page(authors)),
      hasProfile,
      absolute,
    );
    expect(entries.filter((entry) => entry.url.includes('/u/'))).toHaveLength(12);
    expect(peak).toBeLessThanOrEqual(PROFILE_CHECK_CONCURRENCY);
  });
});

describe('mapWithConcurrency', () => {
  it('giữ đúng thứ tự kết quả', async () => {
    const delays = [15, 1, 8, 3];
    const results = await mapWithConcurrency(delays, 2, async (delay) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return delay * 10;
    });
    expect(results).toEqual([150, 10, 80, 30]);
  });

  it('không gọi gì với danh sách rỗng', async () => {
    const task = vi.fn();
    expect(await mapWithConcurrency([], 4, task)).toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });
});
