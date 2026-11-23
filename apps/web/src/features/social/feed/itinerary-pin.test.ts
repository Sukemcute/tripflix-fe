import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  areFeedSidebarsPinned,
  isCommentPinned,
  isItineraryPinned,
  PINNED_ITINERARY_MIN_WIDTH,
  PINNED_ITINERARY_QUERY,
  PINNED_SIDEBARS_MIN_WIDTH,
  PINNED_SIDEBARS_QUERY,
  resolveFeedRightOpen,
  resolveTabItineraryOpen,
  shouldCloseCommentOnToggle,
} from './itinerary-pin';

const directory = dirname(fileURLToPath(import.meta.url));
const inspirationSource = readFileSync(resolve(directory, '../inspiration-view.tsx'), 'utf8');
const feedViewSource = readFileSync(resolve(directory, 'social-feed-view.tsx'), 'utf8');
const feedCss = readFileSync(resolve(directory, 'social-feed.module.css'), 'utf8');

describe('isItineraryPinned & isCommentPinned', () => {
  it('dùng đúng mốc 1200px dùng chung với CSS', () => {
    expect(PINNED_SIDEBARS_MIN_WIDTH).toBe(1200);
    expect(PINNED_ITINERARY_MIN_WIDTH).toBe(1200);
    expect(PINNED_SIDEBARS_QUERY).toBe('(min-width: 1200px)');
    expect(PINNED_ITINERARY_QUERY).toBe('(min-width: 1200px)');
    expect(feedCss).toContain(`@media ${PINNED_SIDEBARS_QUERY}`);
  });

  it('chỉ ghim cả hai cột ở tab Bài viết khi bề rộng >= 1200px; Reels và <1200px không ghim', () => {
    for (const width of [1920, 1440, 1280, 1200]) {
      expect(areFeedSidebarsPinned(width, 'posts')).toBe(true);
      expect(isItineraryPinned(width, 'posts')).toBe(true);
      expect(isCommentPinned(width, 'posts')).toBe(true);
      expect(areFeedSidebarsPinned(width, 'reels')).toBe(false);
      expect(isCommentPinned(width, 'reels')).toBe(false);
    }
    for (const width of [1199, 1024, 390, null]) {
      expect(areFeedSidebarsPinned(width, 'posts')).toBe(false);
      expect(isItineraryPinned(width, 'posts')).toBe(false);
      expect(isCommentPinned(width, 'posts')).toBe(false);
    }
  });
});

describe('cột Bình luận cố định từ 1200px', () => {
  it('luôn mở cột Bình luận khi ghim (>=1200px) kể cả choice=false; <1200px giữ lựa chọn người dùng', () => {
    expect(resolveFeedRightOpen(false, true, true)).toBe(true);
    expect(resolveFeedRightOpen(null, false, true)).toBe(true);
    expect(resolveFeedRightOpen(false, true, false)).toBe(false);
    expect(resolveFeedRightOpen(null, true, false)).toBe(true);
    expect(resolveFeedRightOpen(null, false, false)).toBe(false);
  });

  it('bấm lại nút bình luận cùng bài khi đang ghim không đóng cột; <1200px vẫn đóng như cũ', () => {
    expect(
      shouldCloseCommentOnToggle({
        isRightOpen: true,
        currentActivePostId: 'post-1',
        targetPostId: 'post-1',
        isPinned: true,
      }),
    ).toBe(false);
    expect(
      shouldCloseCommentOnToggle({
        isRightOpen: true,
        currentActivePostId: 'post-1',
        targetPostId: 'post-1',
        isPinned: false,
      }),
    ).toBe(true);
    expect(
      shouldCloseCommentOnToggle({
        isRightOpen: true,
        currentActivePostId: 'post-1',
        targetPostId: 'post-2',
        isPinned: false,
      }),
    ).toBe(false);
  });

  it('SocialFeedView bỏ nút đóng bình luận và gắn data-comment-pinned khi ghim', () => {
    expect(feedViewSource).toContain('data-comment-pinned={isRightPinned ? \'true\' : undefined}');
    expect(feedViewSource).toContain('{!isRightPinned && (');
  });
});

describe('resolveTabItineraryOpen — tách state Bài viết và Reels', () => {
  it('tắt hoặc bật Lịch trình ở Reels không làm đổi tab Bài viết', () => {
    expect(
      resolveTabItineraryOpen({
        view: 'posts',
        isWideScreen: true,
        isPinnedWidth: false,
        postsChoice: null,
        reelsChoice: false,
      }),
    ).toBe(true);
    expect(
      resolveTabItineraryOpen({
        view: 'posts',
        isWideScreen: true,
        isPinnedWidth: false,
        postsChoice: null,
        reelsChoice: true,
      }),
    ).toBe(true);
  });

  it('đóng Lịch trình ở Bài viết (<1200px) không làm đổi Reels', () => {
    expect(
      resolveTabItineraryOpen({
        view: 'reels',
        isWideScreen: true,
        isPinnedWidth: false,
        postsChoice: false,
        reelsChoice: null,
      }),
    ).toBe(false);
    expect(
      resolveTabItineraryOpen({
        view: 'reels',
        isWideScreen: true,
        isPinnedWidth: false,
        postsChoice: true,
        reelsChoice: false,
      }),
    ).toBe(false);
  });

  it('trên >=1200px tab Bài viết luôn mở kể cả postsChoice=false; Reels vẫn tự bật/tắt', () => {
    expect(
      resolveTabItineraryOpen({
        view: 'posts',
        isWideScreen: true,
        isPinnedWidth: true,
        postsChoice: false,
        reelsChoice: false,
      }),
    ).toBe(true);
    expect(
      resolveTabItineraryOpen({
        view: 'reels',
        isWideScreen: true,
        isPinnedWidth: true,
        postsChoice: false,
        reelsChoice: true,
      }),
    ).toBe(true);
    expect(
      resolveTabItineraryOpen({
        view: 'reels',
        isWideScreen: true,
        isPinnedWidth: true,
        postsChoice: true,
        reelsChoice: false,
      }),
    ).toBe(false);
  });

  it('InspirationView dùng hai state riêng postsItineraryChoice và reelsItineraryChoice', () => {
    expect(inspirationSource).toContain('postsItineraryChoice');
    expect(inspirationSource).toContain('reelsItineraryChoice');
  });
});
