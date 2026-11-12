import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { findCachedFeedCard, removeReelFromSavedFeedCache, updateReelSocialCache } from './reel-social-cache';
import type { FeedCardDto } from './generated/core-api/model/feedCardDto';
import type { FeedPageDto } from './generated/core-api/model/feedPageDto';
import type { SocialPostDetailDto } from './generated/core-api/model/socialPostDetailDto';

const feedKey = ['feed', 'for_you', 'viewer'];
const detailKey = ['social', 'post', 'one', 'viewer'];
const card = (postId: string): FeedCardDto => ({
  postId,
  title: 'Chuyến đi',
  caption: 'Một chuyến đi',
  author: { id: 'author', name: 'Tác giả', avatarUrl: null, isKol: false },
  video: {
    hlsUrl: 'https://example.test/master.m3u8',
    posters: { w360: '', w540: '', w720: '' },
    durationSec: 10,
    aspect: '9:16',
    levels: [],
  },
  region: null,
  tags: [],
  linkedProductIds: [],
  reason: null,
  counts: { likes: 5, saves: 3, comments: 2, shares: 1 },
  viewerState: { liked: false, saved: false },
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { structuralSharing: false } } });
  const feed: InfiniteData<FeedPageDto> = {
    pages: [
      { items: [card('one')], nextCursor: 'cursor' },
      { items: [card('two')], nextCursor: null },
    ],
    pageParams: [undefined, 'cursor'],
  };
  client.setQueryData(feedKey, feed);
  return { client, feed, read: () => client.getQueryData<InfiniteData<FeedPageDto>>(feedKey)! };
}

it('updates like/save in place across pages while preserving video identity and pagination', () => {
  const { client, feed, read } = setup();
  updateReelSocialCache(client, 'viewer', 'one', 'like', true);
  updateReelSocialCache(client, 'viewer', 'two', 'save', true);
  expect(read().pages[0]!.items[0]!.counts.likes).toBe(6);
  expect(read().pages[1]!.items[0]!.viewerState?.saved).toBe(true);
  expect(read().pages[1]!.items[0]!.counts.saves).toBe(4);
  expect(read().pages[0]!.items[0]!.video).toBe(feed.pages[0]!.items[0]!.video);
  expect(read().pageParams).toBe(feed.pageParams);
  expect(read().pages.map((page) => page.nextCursor)).toEqual(['cursor', null]);
  expect(read().pages.flatMap((page) => page.items.map((item) => item.postId))).toEqual(['one', 'two']);
});

it('keeps the same post in sync across feed tabs, including rollback', () => {
  const { client, feed, read } = setup();
  const hotKey = ['feed', 'hot', 'viewer'];
  client.setQueryData(hotKey, feed);
  const readHot = () => client.getQueryData<InfiniteData<FeedPageDto>>(hotKey)!;

  const rollback = updateReelSocialCache(client, 'viewer', 'one', 'like', true);
  expect(read().pages[0]!.items[0]!.counts.likes).toBe(6);
  expect(readHot().pages[0]!.items[0]!.counts.likes).toBe(6);
  expect(readHot().pages[0]!.items[0]!.viewerState?.liked).toBe(true);

  rollback();
  expect(readHot().pages[0]!.items[0]!.counts.likes).toBe(5);
  expect(readHot().pages[0]!.items[0]!.viewerState?.liked).toBe(false);
});

it('keeps the saved Reels list in sync with the other tabs, including rollback', () => {
  const { client, feed, read } = setup();
  const savedKey = ['feed', 'saved', 'viewer'];
  client.setQueryData(savedKey, feed);
  const readSaved = () => client.getQueryData<InfiniteData<FeedPageDto>>(savedKey)!;

  const rollback = updateReelSocialCache(client, 'viewer', 'one', 'save', true);
  expect(read().pages[0]!.items[0]!.counts.saves).toBe(4);
  expect(readSaved().pages[0]!.items[0]!.counts.saves).toBe(4);
  expect(readSaved().pages[0]!.items[0]!.viewerState?.saved).toBe(true);

  rollback();
  expect(readSaved().pages[0]!.items[0]!.counts.saves).toBe(3);
  expect(readSaved().pages[0]!.items[0]!.viewerState?.saved).toBe(false);
});

it('rolls back just the failed action without discarding successful saves, comments or another reel', () => {
  const { client, read } = setup();
  const rollback = updateReelSocialCache(client, 'viewer', 'one', 'like', true);
  updateReelSocialCache(client, 'viewer', 'one', 'save', true);
  updateReelSocialCache(client, 'viewer', 'two', 'like', true);
  client.setQueryData<InfiniteData<FeedPageDto>>(feedKey, (data) => ({
    ...data!,
    pages: data!.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => ({
        ...item,
        counts: { ...item.counts, comments: 9 },
      })),
    })),
  }));
  rollback();
  expect(read().pages[0]!.items[0]!.viewerState).toEqual({ liked: false, saved: true });
  expect(read().pages[0]!.items[0]!.counts).toEqual({ likes: 5, saves: 4, comments: 9, shares: 1 });
  expect(read().pages[1]!.items[0]!.counts.likes).toBe(6);
});

it('keeps post detail and feed consistent, supports undo and never produces negative counts', () => {
  const { client, read } = setup();
  // Only the fields used by the cache patch are needed in this server-response fixture.
  const detail = {
    post: { reactionTotal: 5, bookmarkCount: 3, commentCount: 2 },
    viewerContext: { myReaction: null, isBookmarked: false },
    shareUrl: 'https://example.test/one',
  } as SocialPostDetailDto;
  client.setQueryData(detailKey, detail);
  const rollback = updateReelSocialCache(client, 'viewer', 'one', 'like', true);
  expect(client.getQueryData<SocialPostDetailDto>(detailKey)!.post.reactionTotal).toBe(6);
  expect(client.getQueryData<SocialPostDetailDto>(detailKey)!.viewerContext.myReaction).toBe('like');
  rollback();
  expect(client.getQueryData(detailKey)).toEqual(detail);
  updateReelSocialCache(client, 'viewer', 'one', 'save', true);
  updateReelSocialCache(client, 'viewer', 'one', 'save', true);
  expect(read().pages[0]!.items[0]!.counts.saves).toBe(4);
  updateReelSocialCache(client, 'viewer', 'one', 'save', false);
  expect(read().pages[0]!.items[0]!.counts.saves).toBe(3);
});

it('isolates accounts and does not create an incomplete detail or feed cache entry', () => {
  const { client, feed } = setup();
  updateReelSocialCache(client, 'other-viewer', 'one', 'like', true)();
  expect(client.getQueryData(feedKey)).toBe(feed);
  expect(client.getQueryData(['feed', 'for_you', 'other-viewer'])).toBeUndefined();
  expect(client.getQueryData(detailKey)).toBeUndefined();
});

it('clamps stale counts to zero when removing a reaction', () => {
  const { client, read } = setup();
  const item = card('one');
  item.counts.likes = 0;
  item.viewerState = { liked: true, saved: false };
  client.setQueryData(feedKey, { pages: [{ items: [item], nextCursor: null }], pageParams: [undefined] });
  updateReelSocialCache(client, 'viewer', 'one', 'like', false);
  expect(read().pages[0]!.items[0]!.counts.likes).toBe(0);
});

it('treats an existing non-like reaction as part of the reaction total and restores it on failure', () => {
  const { client } = setup();
  const detail = {
    post: { reactionTotal: 5, bookmarkCount: 3 },
    viewerContext: { myReaction: 'love', isBookmarked: false },
    shareUrl: 'https://example.test/one',
  } as SocialPostDetailDto;
  client.setQueryData(detailKey, detail);
  const rollback = updateReelSocialCache(client, 'viewer', 'one', 'like', false);
  expect(client.getQueryData<SocialPostDetailDto>(detailKey)!.post.reactionTotal).toBe(4);
  rollback();
  expect(client.getQueryData(detailKey)).toEqual(detail);
});

it('finds a post in any cached feed tab and returns nothing for an unknown post', () => {
  const client = new QueryClient();
  client.setQueryData<InfiniteData<FeedPageDto>>(['feed', 'hot', 'viewer'], {
    pages: [{ items: [card('hot-post')], nextCursor: null }],
    pageParams: [undefined],
  });
  expect(findCachedFeedCard(client, 'hot-post')?.postId).toBe('hot-post');
  expect(findCachedFeedCard(client, 'missing')).toBeUndefined();
});

it('removes an unsaved reel from the saved list only, keeping cursors and other tabs', () => {
  const { client, feed, read } = setup();
  const savedKey = ['feed', 'saved', 'viewer'];
  client.setQueryData(savedKey, feed);

  removeReelFromSavedFeedCache(client, 'viewer', 'one');

  const saved = client.getQueryData<InfiniteData<FeedPageDto>>(savedKey)!;
  expect(saved.pages.flatMap((page) => page.items.map((item) => item.postId))).toEqual(['two']);
  expect(saved.pages[0]!.nextCursor).toBe('cursor');
  expect(read().pages[0]!.items[0]!.postId).toBe('one');
  expect(client.getQueryData(['feed', 'saved', 'other-viewer'])).toBeUndefined();
});
