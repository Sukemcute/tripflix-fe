import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { describe, expect, it, vi } from 'vitest';
import { addPublishedPostToFeeds, publishNoticeStore } from './published-post';

type Page = { items: Array<Pick<SocialPostDto, 'id'>> };

const makePost = (overrides: Partial<SocialPostDto> = {}) =>
  ({ id: 'new', postType: 'vlog', status: 'published', title: 'Bài mới', ...overrides }) as SocialPostDto;

function seed() {
  const client = new QueryClient();
  const page = (ids: string[]): InfiniteData<Page> => ({
    pages: [{ items: ids.map((id) => ({ id })) }, { items: [{ id: 'old-3' }] }],
    pageParams: [undefined, 'c1'],
  });
  const keys = {
    recommended: ['social', 'public', 'u1', '', 'vlog', 'recommended'],
    mine: ['social', 'mine', 'u1', '', undefined, 'latest'],
    search: ['social', 'public', 'u1', 'dalat', 'vlog', 'latest'],
    bookmarks: ['social', 'bookmarks', 'u1', '', 'vlog', 'latest'],
  };
  for (const key of Object.values(keys)) client.setQueryData(key, page(['old-1', 'old-2']));
  const ids = (key: unknown[]) =>
    client.getQueryData<InfiniteData<Page>>(key)!.pages.map((p) => p.items.map((item) => item.id));
  return { client, keys, ids };
}

describe('bài vừa đăng hiện ngay trên feed', () => {
  it('chèn lên đầu trang 1 của feed gợi ý và "Bài đăng của tôi", giữ các trang sau', () => {
    const { client, keys, ids } = seed();

    addPublishedPostToFeeds(client, makePost());

    expect(ids(keys.recommended)).toEqual([['new', 'old-1', 'old-2'], ['old-3']]);
    expect(ids(keys.mine)).toEqual([['new', 'old-1', 'old-2'], ['old-3']]);
  });

  it('không chèn vào kết quả tìm kiếm và bài đã lưu', () => {
    const { client, keys, ids } = seed();

    addPublishedPostToFeeds(client, makePost());

    expect(ids(keys.search)[0]).toEqual(['old-1', 'old-2']);
    expect(ids(keys.bookmarks)[0]).toEqual(['old-1', 'old-2']);
  });

  it('không chèn trùng, không chèn Reels (đi qua feed video sau khi xử lý) hay bài chưa đăng', () => {
    const { client, keys, ids } = seed();

    addPublishedPostToFeeds(client, makePost({ id: 'old-3' }));
    addPublishedPostToFeeds(client, makePost({ id: 'reel', postType: 'video' }));
    addPublishedPostToFeeds(client, makePost({ id: 'draft', status: 'draft' }));

    expect(ids(keys.recommended)[0]).toEqual(['old-1', 'old-2']);
  });
});

describe('thông báo đã đăng', () => {
  it('giữ trạng thái held từ server và không đưa bài held vào feed công khai', () => {
    const { client, keys, ids } = seed();
    addPublishedPostToFeeds(client, makePost({ status: 'held' }));
    expect(ids(keys.recommended)[0]).toEqual(['old-1', 'old-2']);
    publishNoticeStore.show('p-held', 'vlog', 'held');
    expect(publishNoticeStore.get()).toMatchObject({ postId: 'p-held', status: 'held' });
    publishNoticeStore.hide();
  });
  it('báo cho nơi đang nghe khi hiện và khi ẩn', () => {
    const listener = vi.fn();
    const unsubscribe = publishNoticeStore.subscribe(listener);

    publishNoticeStore.show('p1', 'vlog');
    expect(publishNoticeStore.get()).toMatchObject({ postId: 'p1', postType: 'vlog' });
    publishNoticeStore.hide();
    expect(publishNoticeStore.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
