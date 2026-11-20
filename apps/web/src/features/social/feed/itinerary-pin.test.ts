import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isItineraryPinned,
  PINNED_ITINERARY_MIN_WIDTH,
  PINNED_ITINERARY_QUERY,
  resolveTabItineraryOpen,
} from './itinerary-pin';

const directory = dirname(fileURLToPath(import.meta.url));
const inspirationSource = readFileSync(resolve(directory, '../inspiration-view.tsx'), 'utf8');
const feedCss = readFileSync(resolve(directory, 'social-feed.module.css'), 'utf8');

describe('isItineraryPinned', () => {
  it('dùng đúng mốc 1200px dùng chung với CSS', () => {
    expect(PINNED_ITINERARY_MIN_WIDTH).toBe(1200);
    expect(PINNED_ITINERARY_QUERY).toBe('(min-width: 1200px)');
    expect(feedCss).toContain(`@media ${PINNED_ITINERARY_QUERY}`);
  });

  it('chỉ ghim ở tab Bài viết khi bề rộng >= 1200px', () => {
    expect(isItineraryPinned(1920, 'posts')).toBe(true);
    expect(isItineraryPinned(1440, 'posts')).toBe(true);
    expect(isItineraryPinned(1200, 'posts')).toBe(true);
    expect(isItineraryPinned(1199, 'posts')).toBe(false);
    expect(isItineraryPinned(1024, 'posts')).toBe(false);
    expect(isItineraryPinned(390, 'posts')).toBe(false);
    expect(isItineraryPinned(null, 'posts')).toBe(false);
    expect(isItineraryPinned(1920, 'reels')).toBe(false);
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
