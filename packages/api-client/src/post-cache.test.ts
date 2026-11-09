import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { HttpError } from './http';
import { evictPostFromCache, isPostNotFoundError } from './post-cache';
import type { FeedCardDto } from './generated/core-api/model/feedCardDto';
import type { FeedPageDto } from './generated/core-api/model/feedPageDto';

describe('post-cache', () => {
  describe('isPostNotFoundError', () => {
    it('nhận diện đúng lỗi 404 từ HttpError', () => {
      expect(isPostNotFoundError(new HttpError(404, { message: 'Not found' }))).toBe(true);
    });

    it('nhận diện đúng lỗi 404 từ generic error object', () => {
      expect(isPostNotFoundError({ status: 404 })).toBe(true);
    });

    it('trả về false đối với các lỗi khác hoặc null/undefined', () => {
      expect(isPostNotFoundError(new HttpError(400, { message: 'Bad request' }))).toBe(false);
      expect(isPostNotFoundError(new HttpError(500, { message: 'Server error' }))).toBe(false);
      expect(isPostNotFoundError(new Error('Network error'))).toBe(false);
      expect(isPostNotFoundError(null)).toBe(false);
      expect(isPostNotFoundError(undefined)).toBe(false);
    });
  });

  describe('evictPostFromCache', () => {
    it('xoá query chi tiết và lọc bài viết khỏi infinite feed và danh sách social', () => {
      const client = new QueryClient({
        defaultOptions: { queries: { structuralSharing: false } },
      });

      // Mock dữ liệu chi tiết
      client.setQueryData(['social', 'post', 'post-1', 'user-1'], {
        post: { id: 'post-1', title: 'Bài viết 1' },
      });
      client.setQueryData(['social', 'comments', 'post-1'], [{ id: 'cmt-1' }]);

      // Mock dữ liệu reels feed
      const reelFeed: InfiniteData<FeedPageDto> = {
        pages: [
          {
            items: [
              { postId: 'post-1' } as FeedCardDto,
              { postId: 'post-2' } as FeedCardDto,
            ],
            nextCursor: 'next',
          },
        ],
        pageParams: [undefined],
      };
      client.setQueryData(['feed', 'for_you', 'user-1'], reelFeed);

      // Mock dữ liệu social list
      const socialList: InfiniteData<{ items: { id: string; title: string }[] }> = {
        pages: [
          {
            items: [
              { id: 'post-1', title: 'Bài viết 1' },
              { id: 'post-3', title: 'Bài viết 3' },
            ],
          },
        ],
        pageParams: [undefined],
      };
      client.setQueryData(['social', 'public', 'user-1', ''], socialList);

      // Thực thi evict
      evictPostFromCache(client, 'post-1');

      // 1. Kiểm tra query chi tiết bị remove
      expect(client.getQueryData(['social', 'post', 'post-1', 'user-1'])).toBeUndefined();
      expect(client.getQueryData(['social', 'comments', 'post-1'])).toBeUndefined();

      // 2. Kiểm tra reels feed đã loại bỏ post-1
      const updatedFeed = client.getQueryData<InfiniteData<FeedPageDto>>(['feed', 'for_you', 'user-1']);
      expect(updatedFeed?.pages[0]?.items).toHaveLength(1);
      expect(updatedFeed?.pages[0]?.items[0]?.postId).toBe('post-2');

      // 3. Kiểm tra social list đã loại bỏ post-1
      const updatedSocial = client.getQueryData<InfiniteData<{ items: { id: string; title: string }[] }>>([
        'social',
        'public',
        'user-1',
        '',
      ]);
      expect(updatedSocial?.pages[0]?.items).toHaveLength(1);
      expect(updatedSocial?.pages[0]?.items[0]?.id).toBe('post-3');
    });
  });
});
