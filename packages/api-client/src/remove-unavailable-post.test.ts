import { QueryClient } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { removeUnavailablePost } from './remove-unavailable-post';

it('404 loại bài khỏi mọi tab và bookmark, giữ cursor và không chạm cache bình luận', () => {
  const client = new QueryClient();
  for (const tab of ['for_you', 'hot'])
    client.setQueryData(['feed', tab, 'viewer'], {
      pages: [{ items: [{ postId: 'gone' }, { postId: 'keep' }], nextCursor: 'opaque' }],
      pageParams: [undefined],
    });
  client.setQueryData(['social', 'bookmarks', 'viewer'], {
    pages: [{ items: [{ id: 'gone' }, { id: 'keep' }], nextCursor: 'next' }],
    pageParams: [undefined],
  });
  const comments = { pages: [{ items: [{ id: 'gone', body: 'Bình luận khác ID trùng' }] }] };
  client.setQueryData(['social', 'comments', 'post'], comments);
  removeUnavailablePost(client, 'gone');
  for (const tab of ['for_you', 'hot'])
    expect(client.getQueryData(['feed', tab, 'viewer'])).toEqual({
      pages: [{ items: [{ postId: 'keep' }], nextCursor: 'opaque' }],
      pageParams: [undefined],
    });
  expect(client.getQueryData(['social', 'bookmarks', 'viewer'])).toEqual({
    pages: [{ items: [{ id: 'keep' }], nextCursor: 'next' }],
    pageParams: [undefined],
  });
  expect(client.getQueryData(['social', 'comments', 'post'])).toEqual(comments);
});
