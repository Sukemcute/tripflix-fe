import { QueryClient, hydrate } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { authorVlogsQueryKey, publicProfileQueryKey } from '@tripflix/api-client/profile-query-keys';
import { createProfileHydrationState } from './profile-hydration';
import { makePost } from './seo-fixtures';

const profile = { id: 'u1', displayName: 'Mai', followerCount: 12, followingCount: 3, likeCount: 40 };
const vlogPage = { items: [makePost({ id: 'v1' })], nextCursor: 'c2', hasMore: true };

/** Mô phỏng phía client: nạp trạng thái server gửi xuống rồi đọc lại đúng khoá. */
function readOnClient(state: ReturnType<typeof createProfileHydrationState>) {
  const client = new QueryClient();
  hydrate(client, state);
  return {
    profile: client.getQueryData(publicProfileQueryKey('u1')),
    vlogs: client.getQueryData(authorVlogsQueryKey('u1')),
  };
}

describe('createProfileHydrationState', () => {
  it('đặt hồ sơ và trang vlog đúng khoá client dùng, hình dạng infinite query', () => {
    const { profile: cachedProfile, vlogs } = readOnClient(
      createProfileHydrationState('u1', profile, vlogPage),
    );
    expect(cachedProfile).toEqual(profile);
    expect(vlogs).toEqual({ pages: [vlogPage], pageParams: [undefined] });
  });

  it('bỏ qua phần nào null (lỗi, timeout, 404) để client tải như cũ', () => {
    const { profile: cachedProfile, vlogs } = readOnClient(createProfileHydrationState('u1', null, null));
    expect(cachedProfile).toBeUndefined();
    expect(vlogs).toBeUndefined();
  });

  it('khoá trùng đúng giá trị mà client đang dùng, để không lệch cache', () => {
    expect(publicProfileQueryKey('u1')).toEqual(['social', 'profile', 'u1']);
    expect(authorVlogsQueryKey('u1')).toEqual(['social', 'author', 'u1', 'vlog']);
  });
});
