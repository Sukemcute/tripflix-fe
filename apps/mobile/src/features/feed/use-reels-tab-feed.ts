import {
  reloadRecommendedReels,
  reloadReelsFeed,
  useApiSession,
  useRecommendedReelsFeed,
  useReelsFeed,
  type ReelFeedTab,
} from '@tripflix/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getReelsTabSource } from './reels-tab-source';

/**
 * Danh sách của một tab Reels và cách tải lại nó. Hook không gọi có điều kiện được,
 * nên gọi cả hai nguồn và chỉ bật nguồn mà tab đang dùng.
 */
export function useReelsTabFeed(tab: ReelFeedTab) {
  const { user } = useApiSession();
  const queryClient = useQueryClient();
  const source = getReelsTabSource(tab, { isSignedIn: Boolean(user) });
  const recommended = useRecommendedReelsFeed({ mode: 'mixed', enabled: source === 'recommended' });
  const feed = useReelsFeed({ tab, enabled: source === 'feed' });
  const reload = useCallback(
    () => (source === 'recommended' ? reloadRecommendedReels(queryClient, 'mixed') : reloadReelsFeed(queryClient, tab)),
    [queryClient, source, tab],
  );
  return { feed: source === 'recommended' ? recommended : feed, reload };
}
