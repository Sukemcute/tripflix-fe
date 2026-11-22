import { InfiniteQueryObserver, QueryClient, type InfiniteData } from '@tanstack/react-query';
import type {
  FeedPageDto,
  SocialCommentDto,
  SocialCommentPageDto,
  SocialPostDetailDto,
} from '@tripflix/api-client/core-api/model/index';
import { describe, expect, it, vi } from 'vitest';
import { socialApi } from '@tripflix/api-client';
import {
  addCommentToCache,
  refreshCommentsIfStale,
  removeCommentFromCache,
  replaceCommentInCache,
  setCommentReactionInCache,
  reloadPostComments,
} from './comment-cache';

vi.mock('@tripflix/api-client', () => ({ socialApi: { getPost: vi.fn() } }));

it('realtime tải lại danh sách gốc, trả lời và focus, cập nhật số đếm từ server', async () => {
  const client = new QueryClient();
  client.setQueryData(['social', 'comments', 'p1'], { pages: [], pageParams: [] });
  client.setQueryData(['social', 'comments', 'p1', 'root'], { pages: [], pageParams: [] });
  client.setQueryData(['social', 'comment-thread', 'p1', 'focus'], { items: [] });
  client.setQueryData(['social', 'post', 'p1'], { post: { id: 'p1', commentCount: 4 } });
  const list = { pages: [{ items: [{ id: 'p1', commentCount: 4 }, { id: 'p2', commentCount: 8 }] }], pageParams: [null] };
  client.setQueryData(['social', 'public', 'viewer'], list);
  vi.mocked(socialApi.getPost).mockResolvedValue({ post: { id: 'p1', commentCount: 2 } } as SocialPostDetailDto);

  await reloadPostComments(client, 'p1');

  expect(client.getQueryState(['social', 'comments', 'p1'])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['social', 'comments', 'p1', 'root'])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['social', 'comment-thread', 'p1', 'focus'])?.isInvalidated).toBe(true);
  expect(client.getQueryData(['social', 'post', 'p1'])).toEqual({ post: { id: 'p1', commentCount: 2 } });
  expect(client.getQueryData(['social', 'public', 'viewer'])).toEqual({ ...list, pages: [{ items: [
    { id: 'p1', commentCount: 2 }, { id: 'p2', commentCount: 8 },
  ] }] });
});

it.each([
  { kind: 'created' as const, parent: undefined, target: 'root' },
  { kind: 'created' as const, parent: 'root-1', target: 'replies' },
  { kind: 'updated' as const, parent: undefined, target: 'root' },
  { kind: 'hidden' as const, parent: undefined, target: 'root' },
  { kind: 'deleted' as const, parent: undefined, target: 'root' },
])('$kind parent=$parent: chỉ một request trang đầu dù đã cuộn 10 trang', async ({ kind, parent, target }) => {
  const client = new QueryClient();
  vi.mocked(socialApi.getPost).mockClear();
  vi.mocked(socialApi.getPost).mockResolvedValue({ post: { id: POST_ID, commentCount: 2 } } as SocialPostDetailDto);
  const roots = vi.fn().mockResolvedValue({ items: [makeComment('root-1')], nextCursor: 'next', total: 100 });
  const replies = vi.fn().mockResolvedValue({ items: [makeComment('reply-1')], nextCursor: null, total: 1 });
  const observer = (key: unknown[], queryFn: typeof roots) => new InfiniteQueryObserver(client, {
    queryKey: key, queryFn, initialPageParam: undefined as string | undefined,
    initialData: makePages(Array.from({ length: 10 }, (_, i) => [makeComment(`c-${i}`)]), 100),
    getNextPageParam: (page: SocialCommentPageDto) => page.nextCursor ?? undefined, staleTime: Infinity,
  });
  const rootObserver = observer(rootListKey, roots);
  const repliesObserver = observer(repliesKey('root-1'), replies);
  const stopRoot = rootObserver.subscribe(() => {});
  const stopReplies = repliesObserver.subscribe(() => {});
  try {
    await reloadPostComments(client, POST_ID, [{ postId: POST_ID, kind, parentCommentId: parent, actorId: 'other' }]);
    expect(roots).toHaveBeenCalledTimes(target === 'root' ? 1 : 0);
    expect(replies).toHaveBeenCalledTimes(target === 'replies' ? 1 : 0);
    expect(socialApi.getPost).toHaveBeenCalledTimes(kind === 'hidden' || kind === 'deleted' ? 1 : 0);
    expect(client.getQueryData<CommentPages>(target === 'root' ? rootListKey : repliesKey('root-1'))?.pages).toHaveLength(1);
    expect(client.getQueryData<CommentPages>(target === 'root' ? repliesKey('root-1') : rootListKey)?.pages).toHaveLength(10);
  } finally { stopRoot(); stopReplies(); client.clear(); }
});

const POST_ID = 'post-1';
const USER_ID = 'user-1';
const rootListKey = ['social', 'comments', POST_ID, undefined, USER_ID];
const repliesKey = (rootId: string) => ['social', 'comments', POST_ID, rootId, USER_ID];
const detailKey = ['social', 'post', POST_ID, USER_ID];
const postListKey = ['social', 'posts', 'all'];
const feedKey = ['feed', 'forYou', USER_ID];

type CommentPages = InfiniteData<SocialCommentPageDto>;

function makeComment(id: string, overrides: Partial<SocialCommentDto> = {}): SocialCommentDto {
  return {
    moderationState: null,
    id,
    postId: POST_ID,
    authorId: USER_ID,
    authorName: 'An',
    parentCommentId: null,
    replyToCommentId: null,
    replyToExcerpt: null,
    body: `bình luận ${id}`,
    mentions: [],
    isEdited: false,
    likeCount: 0,
    isLiked: false,
    status: 'visible',
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makePages(pages: SocialCommentDto[][], total: number): CommentPages {
  return {
    pages: pages.map((items, index) => ({
      items,
      total,
      nextCursor: index < pages.length - 1 ? `cursor-${index + 1}` : null,
    })),
    pageParams: pages.map((_, index) => (index === 0 ? undefined : `cursor-${index}`)),
  };
}

function seedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
  client.setQueryData(
    rootListKey,
    makePages([[makeComment('c3', { replyCount: 2 }), makeComment('c2', { replyCount: 0 })], [makeComment('c1')]], 3),
  );
  client.setQueryData(
    repliesKey('c3'),
    makePages([[makeComment('r1', { parentCommentId: 'c3' })], [makeComment('r2', { parentCommentId: 'c3' })]], 2),
  );
  client.setQueryData(detailKey, { post: { id: POST_ID, commentCount: 5 }, viewerContext: {}, shareUrl: '' });
  client.setQueryData(postListKey, {
    pages: [{ items: [{ id: POST_ID, commentCount: 5 }, { id: 'post-2', commentCount: 9 }] }],
    pageParams: [undefined],
  });
  client.setQueryData(feedKey, {
    pages: [{ items: [{ postId: POST_ID, counts: { likes: 0, comments: 5, saves: 0, shares: 0 } }] }],
    pageParams: [undefined],
  });
  return client;
}

const rootList = (client: QueryClient) => client.getQueryData<CommentPages>(rootListKey)!;
const ids = (data: CommentPages) => data.pages.map((page) => page.items.map((comment) => comment.id));
const totals = (data: CommentPages) => data.pages.map((page) => page.total);
const postCounts = (client: QueryClient) => ({
  detail: client.getQueryData<SocialPostDetailDto>(detailKey)!.post.commentCount,
  list: client.getQueryData<InfiniteData<{ items: { id: string; commentCount: number }[] }>>(postListKey)!.pages[0]!
    .items,
  feed: client.getQueryData<InfiniteData<FeedPageDto>>(feedKey)!.pages[0]!.items[0]!.counts.comments,
});

describe('comment-cache', () => {
  it('gửi bình luận gốc: chèn lên đầu trang 1, cộng tổng mọi trang và số bình luận của bài ở mọi nơi', () => {
    const client = seedClient();

    addCommentToCache(client, makeComment('c4'));

    expect(ids(rootList(client))).toEqual([['c4', 'c3', 'c2'], ['c1']]);
    expect(totals(rootList(client))).toEqual([4, 4]);
    expect(rootList(client).pages[0]!.items[0]!.replyCount).toBe(0);
    expect(ids(client.getQueryData<CommentPages>(repliesKey('c3'))!)).toEqual([['r1'], ['r2']]);
    expect(postCounts(client)).toEqual({
      detail: 6,
      list: [
        { id: POST_ID, commentCount: 6 },
        { id: 'post-2', commentCount: 9 },
      ],
      feed: 6,
    });
  });

  it('gửi trả lời: nối vào cuối trang cuối danh sách trả lời (thứ tự cũ trước ASC) và cộng replyCount của bình luận gốc', () => {
    const client = seedClient();

    addCommentToCache(client, makeComment('r3', { parentCommentId: 'c3' }));

    expect(ids(client.getQueryData<CommentPages>(repliesKey('c3'))!)).toEqual([['r1'], ['r2', 'r3']]);
    expect(totals(client.getQueryData<CommentPages>(repliesKey('c3'))!)).toEqual([3, 3]);
    expect(ids(rootList(client))).toEqual([['c3', 'c2'], ['c1']]);
    expect(rootList(client).pages[0]!.items[0]!.replyCount).toBe(3);
    expect(postCounts(client).detail).toBe(6);
  });

  it('bình luận bị giữ chờ duyệt vẫn hiện cho người gửi nhưng không cộng số bình luận của bài (như BE)', () => {
    const client = seedClient();

    addCommentToCache(client, makeComment('c4', { status: 'held' }));

    expect(ids(rootList(client))[0]).toEqual(['c4', 'c3', 'c2']);
    expect(postCounts(client).detail).toBe(5);
    expect(postCounts(client).feed).toBe(5);
  });

  it('trả lời held không tăng số trả lời công khai của bình luận gốc', () => {
    const client = seedClient();
    addCommentToCache(client, makeComment('r-held', { parentCommentId: 'c3', status: 'held' }));
    expect(rootList(client).pages[0]!.items[0]!.replyCount).toBe(2);
    expect(postCounts(client).detail).toBe(5);
  });

  it('gửi trùng (đã có trong cache) thì không chèn hai lần', () => {
    const client = seedClient();

    addCommentToCache(client, makeComment('c3'));

    expect(ids(rootList(client))).toEqual([['c3', 'c2'], ['c1']]);
    expect(totals(rootList(client))).toEqual([3, 3]);
  });

  it('sửa bình luận: thay đúng dòng, giữ replyCount vì BE không trả khi sửa, sửa cả chuỗi đang xem', () => {
    const client = seedClient();
    const threadKey = ['social', 'comment-thread', POST_ID, 'c3', USER_ID];
    client.setQueryData(threadKey, { items: [makeComment('c3', { replyCount: 2 })], nextCursor: null, total: 1 });

    replaceCommentInCache(client, makeComment('c3', { body: 'đã sửa', isEdited: true }));

    const edited = rootList(client).pages[0]!.items[0]!;
    expect(edited).toMatchObject({ id: 'c3', body: 'đã sửa', isEdited: true, replyCount: 2 });
    expect(client.getQueryData<SocialCommentPageDto>(threadKey)!.items[0]!.body).toBe('đã sửa');
    expect(postCounts(client).detail).toBe(5);
  });

  it('sửa xong bị giữ chờ duyệt: không đoán số, đánh dấu tải lại danh sách và số của bài', () => {
    const client = seedClient();

    replaceCommentInCache(client, makeComment('c3', { body: 'nội dung bị giữ', status: 'held' }));

    expect(client.getQueryState(rootListKey)!.isInvalidated).toBe(true);
    expect(client.getQueryState(detailKey)!.isInvalidated).toBe(true);
    expect(client.getQueryState(feedKey)!.isInvalidated).toBe(true);
  });

  it('xoá bình luận gốc: bỏ khỏi danh sách, bớt tổng mọi trang, trừ cả số trả lời đang hiện, bỏ cache trả lời', () => {
    const client = seedClient();

    removeCommentFromCache(client, POST_ID, 'c3');

    expect(ids(rootList(client))).toEqual([['c2'], ['c1']]);
    expect(totals(rootList(client))).toEqual([2, 2]);
    expect(client.getQueryData(repliesKey('c3'))).toBeUndefined();
    expect(postCounts(client).detail).toBe(2);
    expect(postCounts(client).feed).toBe(2);
  });

  it('xoá trả lời: bớt replyCount của bình luận gốc và trừ 1 bình luận của bài', () => {
    const client = seedClient();

    removeCommentFromCache(client, POST_ID, 'r1');

    expect(ids(client.getQueryData<CommentPages>(repliesKey('c3'))!)).toEqual([[], ['r2']]);
    expect(rootList(client).pages[0]!.items[0]!.replyCount).toBe(1);
    expect(postCounts(client).detail).toBe(4);
  });

  it('xoá bình luận không có trong cache: không đoán số, tải lại số của bài', () => {
    const client = seedClient();

    removeCommentFromCache(client, POST_ID, 'khong-co');

    expect(postCounts(client).detail).toBe(5);
    expect(client.getQueryState(detailKey)!.isInvalidated).toBe(true);
  });

  it('thả tim bình luận: ghi đúng số server trả về ở mọi danh sách, không tải lại', () => {
    const client = seedClient();

    setCommentReactionInCache(client, POST_ID, { commentId: 'r1', isLiked: true, likeCount: 7 });

    const reply = client.getQueryData<CommentPages>(repliesKey('c3'))!.pages[0]!.items[0]!;
    expect(reply).toMatchObject({ id: 'r1', isLiked: true, likeCount: 7 });
    expect(client.getQueryState(repliesKey('c3'))!.isInvalidated).toBe(false);
    expect(client.getQueryState(rootListKey)!.isInvalidated).toBe(false);
  });

  it('mở lại panel khi dữ liệu đã cũ: chỉ giữ trang đầu rồi tải lại; còn mới thì không tải', () => {
    const client = seedClient();
    const staleData = makePages([[makeComment('c3')], [makeComment('c2')], [makeComment('c1')]], 3);
    client.setQueryData(rootListKey, staleData, { updatedAt: Date.now() - 60_000 });

    refreshCommentsIfStale(client, POST_ID);

    expect(ids(rootList(client))).toEqual([['c3']]);
    expect(rootList(client).pageParams).toEqual([undefined]);
    expect(client.getQueryState(rootListKey)!.isInvalidated).toBe(true);
    // Danh sách trả lời vừa tải (còn mới) thì giữ nguyên, không tải lại.
    expect(client.getQueryState(repliesKey('c3'))!.isInvalidated).toBe(false);
  });
});
