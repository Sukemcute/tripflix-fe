import type { SocialPostPageDto } from '@tripflix/api-client/core-api/model/index';
import { describe, expect, it, vi } from 'vitest';
import { collectSitemapEntries, MAX_POST_PAGES, STATIC_SITEMAP_PATHS } from './sitemap-entries';
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
    const urls = (await collectSitemapEntries(load, allProfiles, absolute)).map((entry) => entry.url);
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
    const entries = await collectSitemapEntries(load, allProfiles, absolute);
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
    const urls = (await collectSitemapEntries(load, allProfiles, absolute)).map((entry) => entry.url);
    expect(urls.filter((url) => !STATIC_SITEMAP_PATHS.some(({ path }) => url === absolute(path)))).toEqual([
      'https://tripflix.io.vn/u/a4',
    ]);
  });

  it('API lỗi giữa chừng vẫn trả phần đã đọc', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([makePost({ id: 'p1' })], 'c2'))
      .mockRejectedValueOnce(new Error('HTTP 503'));
    const urls = (await collectSitemapEntries(load, allProfiles, absolute)).map((entry) => entry.url);
    expect(urls).toContain('https://tripflix.io.vn/trip-plans/p1');
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
    const urls = (await collectSitemapEntries(load, hasProfile, absolute)).map((entry) => entry.url);
    expect(urls.filter((url) => url.includes('/u/'))).toEqual(['https://tripflix.io.vn/u/real']);
    expect(hasProfile).toHaveBeenCalledTimes(3);
  });
});
