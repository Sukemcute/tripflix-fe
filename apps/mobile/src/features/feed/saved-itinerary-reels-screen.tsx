import { useQuery } from '@tanstack/react-query';
import { itineraryApi, SAVED_ITINERARIES_QUERY_KEY, useApiSession, useReelsByIds } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiErrorNotice } from '@/components/api-state';
import { LoadingDots } from '@/components/loading-dots';
import { IconButton, Txt } from '@/components/mobile-ui';
import type { ReelItem } from './reel-types';
import { ReelsFeed } from './reels-screen';

export function SavedItineraryReelsScreen() {
  const { reel } = useLocalSearchParams<{ reel?: string }>();
  const { user, isReady } = useApiSession();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const saved = useQuery({
    queryKey: [...SAVED_ITINERARIES_QUERY_KEY, user?.id, 'all'],
    enabled: isReady && !!user && !!reel,
    queryFn: ({ signal }) => itineraryApi.list(undefined, signal),
  });
  const ids = useMemo(() => {
    if (!reel) return [];
    const sources = (saved.data ?? []).flatMap(({ sourcePostId }) => sourcePostId ? [sourcePostId] : []);
    return [...new Set([reel, ...sources])];
  }, [reel, saved.data]);
  const isPreparing = !isReady || (!!user && !!reel && saved.isPending);
  const feed = useReelsByIds(ids, { enabled: !isPreparing });
  const items = useMemo(
    () => (feed.data?.pages.flatMap((page) => page.items) ?? [])
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
  const hasSource = items.some((item) => item.postId === reel);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {hasSource ? (
        <View style={[styles.stage, { paddingBottom: insets.bottom }]}>
          <View style={styles.feed}>
            <ReelsFeed
              items={items}
              targetId={reel}
              onActiveIndexChange={setActiveIndex}
              onLoadMore={() => {
                if (feed.hasNextPage && !feed.isFetching) void feed.fetchNextPage({ cancelRefetch: false });
              }}
              isFetchingMore={feed.isFetchingNextPage}
            />
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          {isPreparing || (!!reel && feed.isPending) ? (
            <LoadingDots color={colors.background} />
          ) : feed.isError ? (
            <ApiErrorNotice error={feed.error} retry={() => void feed.refetch()} />
          ) : (
            <Txt style={styles.message}>{vi.mobile.savedItinerary.sourceReelUnavailable}</Txt>
          )}
        </View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0, 0, 0, 0.82)', 'rgba(0, 0, 0, 0)']}
        style={[styles.scrim, { height: insets.top + 112 }]}
      />
      <View pointerEvents="box-none" style={[styles.header, { top: insets.top + spacing.sm }]}>
        <View style={styles.back}>
          <IconButton
            name="chevron-back"
            label={vi.api.back}
            color={colors.background}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/saved-itineraries'))}
          />
        </View>
        <Txt variant="label" style={styles.title}>
          {vi.mobile.savedItinerary.sourceReelsTitle}
        </Txt>
        <View pointerEvents="none" style={styles.counterSlot}>
          {hasSource && ids.length > 1 && (
            <Txt variant="label" style={styles.counter}>{Math.min(activeIndex + 1, items.length)}</Txt>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080A0E' },
  stage: { flex: 1 },
  feed: { flex: 1, overflow: 'hidden' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  message: { color: colors.background, textAlign: 'center' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.background },
  counterSlot: { width: 44, alignItems: 'flex-end' },
  counter: {
    color: colors.background,
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
