import { useAuthorReels } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiErrorNotice } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';
import { Icon } from '@/components/mobile-ui';
import type { ReelItem } from './reel-types';
import { ReelsFeed } from './reels-screen';

/**
 * Xem reel của một người, mở từ lưới Video trên trang cá nhân (TF105): lướt đúng các reel của người đó,
 * bắt đầu từ reel vừa bấm, thay vì nhảy sang feed Dành cho bạn và dò xem có bài đó không.
 */
export function AuthorReelsScreen() {
  const { userId, reel } = useLocalSearchParams<{ userId?: string; reel?: string }>();
  const insets = useSafeAreaInsets();
  const feed = useAuthorReels(userId);
  const items = useMemo(
    () =>
      (feed.data?.pages.flatMap((page) => page.items) ?? [])
        .filter((card) => !!card.video?.hlsUrl)
        .map((card): ReelItem => ({
          id: card.postId,
          postId: card.postId,
          title: card.title,
          body: card.caption,
          playback: card.video,
          social: card,
        })),
    [feed.data],
  );
  const { hasNextPage, isFetching, isError, fetchNextPage } = feed;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching && !isError) void fetchNextPage({ cancelRefetch: false });
  }, [hasNextPage, isFetching, isError, fetchNextPage]);
  return (
    // Trình phát Reels dùng cử chỉ (tua, nhấn giữ) nên cần gốc của gesture-handler như tab Reels.
    <GestureHandlerRootView style={styles.root}>
      {items.length > 0 ? (
        <ReelsFeed
          items={items}
          targetId={reel}
          onLoadMore={loadMore}
          isFetchingMore={feed.isFetchingNextPage}
        />
      ) : (
        <View style={styles.center}>
          {feed.isPending ? (
            <LoadingDots color={colors.background} />
          ) : (
            <ApiErrorNotice error={feed.error} retry={() => void feed.refetch()} />
          )}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={vi.api.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/me'))}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      >
        <Icon name="chevron-back" size={26} color={colors.background} />
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
});
