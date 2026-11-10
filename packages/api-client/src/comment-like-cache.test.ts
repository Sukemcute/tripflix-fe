import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { updateCommentLikeCache } from './comment-like-cache';
import type { SocialCommentDto } from './generated/core-api/model/socialCommentDto';
import type { SocialCommentPageDto } from './generated/core-api/model/socialCommentPageDto';

const queryKey = ['social', 'comments', 'post', undefined, 'viewer'];
const comment = (id: string, patch: Partial<SocialCommentDto> = {}): SocialCommentDto => ({
  id,
  postId: 'post',
  authorId: 'author',
  parentCommentId: null,
  body: 'Hay quá',
  isEdited: false,
  likeCount: 2,
  isLiked: false,
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
  deletedAt: null,
  ...patch,
});
const seed = (client: QueryClient, items: SocialCommentDto[]) =>
  client.setQueryData<InfiniteData<SocialCommentPageDto>>(queryKey, {
    pages: [{ items, nextCursor: null, total: items.length }],
    pageParams: [undefined],
  });
const read = (client: QueryClient, id: string) =>
  client
    .getQueryData<InfiniteData<SocialCommentPageDto>>(queryKey)
    ?.pages.flatMap((page) => page.items)
    .find((item) => item.id === id);

it('likes only the chosen comment and raises its count', () => {
  const client = new QueryClient();
  seed(client, [comment('one'), comment('two')]);
  updateCommentLikeCache(client, queryKey, 'one', true);
  expect(read(client, 'one')).toMatchObject({ isLiked: true, likeCount: 3 });
  expect(read(client, 'two')).toMatchObject({ isLiked: false, likeCount: 2 });
});

it('removes a like and never lets the count go below zero', () => {
  const client = new QueryClient();
  seed(client, [comment('one', { isLiked: true, likeCount: 0 })]);
  updateCommentLikeCache(client, queryKey, 'one', false);
  expect(read(client, 'one')).toMatchObject({ isLiked: false, likeCount: 0 });
});

it('does not count the same like twice', () => {
  const client = new QueryClient();
  seed(client, [comment('one', { isLiked: true, likeCount: 5 })]);
  updateCommentLikeCache(client, queryKey, 'one', true);
  expect(read(client, 'one')).toMatchObject({ isLiked: true, likeCount: 5 });
});

it('undoes only the like when the request fails, keeping a body edited meanwhile', () => {
  const client = new QueryClient();
  seed(client, [comment('one')]);
  const rollback = updateCommentLikeCache(client, queryKey, 'one', true);
  client.setQueryData<InfiniteData<SocialCommentPageDto>>(
    queryKey,
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => ({ ...item, body: 'Đã sửa' })),
        })),
      },
  );
  rollback();
  expect(read(client, 'one')).toMatchObject({ isLiked: false, likeCount: 2, body: 'Đã sửa' });
});

it('does nothing when the list has not loaded', () => {
  const client = new QueryClient();
  const rollback = updateCommentLikeCache(client, queryKey, 'one', true);
  rollback();
  expect(client.getQueryData(queryKey)).toBeUndefined();
});
