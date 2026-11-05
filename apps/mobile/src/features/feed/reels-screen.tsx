import { useReelsFeed } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  FlatList,
  Platform,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Button, IconButton, Screen, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { ReelSlide } from './reel-slide';
import type { ReelItem } from './reel-types';
import { usePlayerPool } from './use-player-pool';

const copy = vi.mobile.reels;
function readDemoReels(): ReelItem[] {
  const hlsUrl = process.env.EXPO_PUBLIC_REELS_DEMO_HLS_URL;
  if (!__DEV__ || !hlsUrl || !/^https?:\/\//i.test(hlsUrl)) return [];
  let source: URL;
  try {
    source = new URL(hlsUrl);
  } catch {
    return [];
  }
  const poster = process.env.EXPO_PUBLIC_REELS_DEMO_POSTER_URL;
  return [
    {
      id: hlsUrl,
      title: copy.sample,
      playback: {
        hlsUrl,
        posters: {
          w360: poster || new URL('poster_360.jpg', source).href,
          w540: poster || new URL('poster_540.jpg', source).href,
          w720: poster || new URL('poster_720.jpg', source).href,
        },
        durationSec: 0,
        aspect: '9:16',
        levels: [],
      },
    },
  ];
}

const DEMO_REELS = readDemoReels();

export function ReelsScreen() {
  const [isSample, setIsSample] = useState(false);
  const feed = useReelsFeed({ enabled: !isSample });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlight = useRef(false);
  const refreshFeed = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    try {
      await feed.refetch();
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  };
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

  const loadMore = () => {
    if (feed.hasNextPage && !feed.isFetching && !feed.isError)
      void feed.fetchNextPage({ cancelRefetch: false });
  };
  const retryFeed = () => {
    if (feed.isFetching) return;
    if (feed.isFetchNextPageError) {
      void feed.fetchNextPage({ cancelRefetch: false });
      return;
    }
    void feed.refetch();
  };
  if (isSample && DEMO_REELS.length > 0)
    return <ReelsFeed items={DEMO_REELS} isSample onExitSample={() => setIsSample(false)} />;
  if (items.length > 0)
    return (
      <View style={{ flex: 1 }}>
        <ApiErrorNotice error={feed.error} retry={retryFeed} />
        <ReelsFeed
          items={items}
          onLoadMore={loadMore}
          isFetchingMore={feed.isFetchingNextPage}
          onRefresh={() => {
            void refreshFeed();
          }}
          isRefreshing={isRefreshing}
        />
      </View>
    );
  return (
    <Screen title={vi.mobile.tabs.reels}>
      {feed.isPending ? (
        <Txt>{feed.fetchStatus === 'paused' ? copy.offline : copy.loading}</Txt>
      ) : feed.error ? (
        <ApiErrorNotice error={feed.error} retry={retryFeed} />
      ) : (
        <>
          <Txt variant="heading">{copy.emptyTitle}</Txt>
          <Txt>{copy.emptyBody}</Txt>
          <Button onPress={retryFeed}>{vi.api.retry}</Button>
          {feed.hasNextPage && (
            <Button tone="secondary" onPress={loadMore}>
              {vi.api.next}
            </Button>
          )}
          <Button tone="secondary" onPress={() => router.push('/(tabs)/explore')}>
            {vi.api.search}
          </Button>
        </>
      )}
      {DEMO_REELS.length > 0 && (
        <Button tone="secondary" onPress={() => setIsSample(true)}>
          {copy.openSample}
        </Button>
      )}
    </Screen>
  );
}

export function ReelsFeed({
  items,
  isSample = false,
  onExitSample,
  onLoadMore,
  isFetchingMore = false,
  onRefresh,
  isRefreshing = false,
}: {
  items: readonly ReelItem[];
  isSample?: boolean;
  onExitSample?: () => void;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const network = useNetworkState();
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const centeredIndex = useRef(0);
  const [pausedId, setPausedId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [retry, setRetry] = useState<{ id: string; attempt: number } | null>(null);
  const [hasComments, setHasComments] = useState(false);
  const currentIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const visibleIndex = Math.min(focusedIndex, Math.max(0, items.length - 1));
  const isOffline = network.isConnected === false || network.isInternetReachable === false;
  const isDataLimited =
    network.type === NetworkStateType.CELLULAR ||
    (Platform.OS !== 'web' &&
      network.type !== NetworkStateType.WIFI &&
      network.type !== NetworkStateType.ETHERNET);
  const slots = usePlayerPool({
    items,
    activeIndex: currentIndex,
    focusedIndex: visibleIndex,
    isEnabled: isFocused && isForeground && !isOffline,
    isPaused: hasComments || pausedId === items[visibleIndex]?.id,
    isMuted,
    isDataLimited,
    retry,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setIsForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  const settle = useCallback((index: number) => {
    centeredIndex.current = index;
    setFocusedIndex(index);
    setActiveIndex(index);
  }, []);

  const indexAt = (offset: number) =>
    Math.max(0, Math.min(items.length - 1, Math.round(offset / layout.height)));

  // From feed-demo: switch sound halfway through a swipe, replace sources only after settling.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = indexAt(offset);
    if (index !== centeredIndex.current) {
      centeredIndex.current = index;
      setFocusedIndex(index);
      setPausedId(null);
    }
    if (index !== currentIndex && Math.abs(offset - index * layout.height) < 1) settle(index);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.ink }}
      onLayout={(event) => setLayout(event.nativeEvent.layout)}
    >
      {isFocused && <StatusBar style="light" />}
      {layout.height > 0 && layout.width > 0 && (
        <FlatList
          testID="reels-list"
          data={items}
          keyExtractor={(item) => item.id}
          pagingEnabled
          scrollEnabled={!hasComments}
          disableIntervalMomentum
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: layout.height, offset: layout.height * index, index })}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => settle(indexAt(event.nativeEvent.contentOffset.y))}
          windowSize={3}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          onEndReached={onLoadMore}
          onEndReachedThreshold={1}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          ListFooterComponent={
            isFetchingMore ? (
              <ActivityIndicator
                style={{ padding: spacing.lg }}
                color={colors.background}
                accessibilityLabel={copy.loading}
              />
            ) : undefined
          }
          extraData={{ slots, pausedId, isMuted, layout, isOffline, focusedIndex }}
          renderItem={({ item, index }) => {
            const slot = slots.find((entry) => entry.index === index);
            const blockedReason = isOffline ? copy.offline : undefined;
            return (
              <ReelSlide
                item={item}
                player={slot?.player}
                isLoaded={slot?.isLoaded ?? false}
                hasError={slot?.hasError ?? false}
                onAttach={slot?.onAttach}
                width={layout.width}
                height={layout.height}
                isActive={visibleIndex === index}
                isPaused={pausedId === item.id}
                isMuted={isMuted}
                isSample={isSample}
                onCommentsVisibilityChange={setHasComments}
                blockedReason={blockedReason}
                onToggle={() => setPausedId((id) => (id === item.id ? null : item.id))}
                onMute={() => setIsMuted((value) => !value)}
                onRetry={() => setRetry((value) => ({ id: item.id, attempt: (value?.attempt ?? 0) + 1 }))}
              />
            );
          }}
        />
      )}
      {onExitSample && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + spacing.sm,
            left: spacing.lg,
            backgroundColor: colors.overlayHeavy,
          }}
        >
          <IconButton
            name="arrow-back"
            label={copy.backToFeed}
            color={colors.background}
            onPress={onExitSample}
          />
        </View>
      )}
    </View>
  );
}
