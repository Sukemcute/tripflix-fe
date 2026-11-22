import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { RECOMMENDED_REELS_KEY, reloadRecommendedReels, takeRecommendedFresh } from './feed';

type Page = { items: Array<{ postId: string }>; nextCursor: string | null };

const pagesOf = (count: number): InfiniteData<Page, string | undefined> => ({
  pages: Array.from({ length: count }, (_, index) => ({ items: [{ postId: `p${index}` }], nextCursor: `c${index + 1}` })),
  pageParams: Array.from({ length: count }, (_, index) => (index === 0 ? undefined : `c${index}`)),
});

it('chỉ giữ trang đầu của đúng mode được tải lại, cho mọi người dùng, không đụng mode khác', async () => {
  const client = new QueryClient();
  const forYouA = [...RECOMMENDED_REELS_KEY, 'for_you', 'user-a'];
  const forYouB = [...RECOMMENDED_REELS_KEY, 'for_you', 'user-b'];
  const trending = [...RECOMMENDED_REELS_KEY, 'trending', 'user-a'];
  client.setQueryData(forYouA, pagesOf(3));
  client.setQueryData(forYouB, pagesOf(2));
  client.setQueryData(trending, pagesOf(3));

  await reloadRecommendedReels(client, 'for_you');

  const read = (key: unknown[]) => client.getQueryData<InfiniteData<Page, string | undefined>>(key)!;
  expect(read(forYouA).pages.map((page) => page.items[0]!.postId)).toEqual(['p0']);
  expect(read(forYouA).pageParams).toEqual([undefined]);
  expect(read(forYouB).pages).toHaveLength(1);
  expect(read(trending).pages).toHaveLength(3);
});

it('bỏ qua khi chưa có danh sách trong cache', async () => {
  const client = new QueryClient();
  await expect(reloadRecommendedReels(client, 'for_you')).resolves.toBeUndefined();
  expect(client.getQueryData([...RECOMMENDED_REELS_KEY, 'for_you'])).toBeUndefined();
});

it('tải lại thì trang đầu kế tiếp gửi fresh đúng một lần, chỉ cho mode đó', async () => {
  const client = new QueryClient();
  takeRecommendedFresh('mixed');
  await reloadRecommendedReels(client, 'mixed');
  expect(takeRecommendedFresh('trending')).toBe(false);
  expect(takeRecommendedFresh('mixed')).toBe(true);
  expect(takeRecommendedFresh('mixed')).toBe(false);
});
