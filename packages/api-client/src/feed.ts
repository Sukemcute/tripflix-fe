import { useInfiniteQuery } from '@tanstack/react-query';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import { readPage } from './response';
import { useApiSession } from './session';

export const feedApi = {
  async list(cursor?: string, signal?: AbortSignal) {
    return readPage((await feedControllerGetFeed({ cursor, limit: 10, tab: 'for_you' }, { signal })).data);
  },
};

export function useReelsFeed({ enabled = true }: { enabled?: boolean } = {}) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['feed', 'for_you', user?.id],
    enabled: isReady && enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => feedApi.list(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
