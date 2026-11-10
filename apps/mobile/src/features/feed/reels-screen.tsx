import {
  getReelPosterPrefetchUrls,
  getSwipedTabIndex,
  layoutReelVideo,
  selectReelPoster,
} from '@tripflix/app-core';
import { useReelsFeed, type ReelFeedTab } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Button, Icon, IconButton, Txt } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';
import { SHEET_CLOSE_SPRING } from '@/components/motion';
import { ReelSlide } from './reel-slide';
import type { ReelItem } from './reel-types';
import { REEL_TABS, REELS_TAB_BAR_HEIGHT, ReelsTabBar, type ReelTab } from './reels-tab-bar';
import { usePlayerPool } from './use-player-pool';

const copy = vi.mobile.reels;
const TAB_EDGE_RESISTANCE = 0.25;
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
// shortcut: core chưa có API lấy reel theo id bài; dò tối đa 5 trang feed (50 reel), đủ cho dữ liệu pilot.
const MAX_JUMP_PAGES = 5;

export function ReelsScreen() {
  const [tab, setTab] = useState<ReelTab>('for_you');
  const [isSample, setIsSample] = useState(false);
  const [isChromeHidden, setIsChromeHidden] = useState(false);
  /** Reel cần mở ngay (ví dụ bấm thẻ video trong khung chat Tripi). */
  const { reel: targetId } = useLocalSearchParams<{ reel?: string }>();
  const clearTarget = useCallback(() => router.setParams({ reel: undefined }), []);
  const { width } = useWindowDimensions();
  // The bar follows `tab` at once; the list only changes after the old one has left the screen.
  const [contentTab, setContentTab] = useState<ReelTab>('for_you');
  const [coverTab, setCoverTab] = useState<ReelTab | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  // Loaded up front so a swipe finds its list and first poster ready instead of a dark wait.
  const forYouFeed = useReelsFeed({ tab: 'for_you' });
  const hotFeed = useReelsFeed({ tab: 'hot' });
  const forYouPlaybacks = useMemo(() => readPlaybacks(forYouFeed.data), [forYouFeed.data]);
  const hotPlaybacks = useMemo(() => readPlaybacks(hotFeed.data), [hotFeed.data]);
  const firstPlaybackOf = (reelTab: ReelTab) =>
    reelTab === 'for_you' ? forYouPlaybacks[0] : reelTab === 'hot' ? hotPlaybacks[0] : undefined;
  useEffect(() => {
    const urls = [forYouPlaybacks, hotPlaybacks].flatMap((playbacks) =>
      getReelPosterPrefetchUrls(
        playbacks.map((playback) => playback.posters),
        -1,
        width,
      ),
    );
    if (urls.length > 0) void Image.prefetch(urls, { cachePolicy: 'memory-disk' });
  }, [forYouPlaybacks, hotPlaybacks, width]);
  const translateX = useSharedValue(0);
  const swipeStartX = useSharedValue(0);
  const tabIndex = useSharedValue(0);
  const isSwitching = useSharedValue(false);
  const canSwipe = useDerivedValue(() => !isSwitching.get());
  const selectedIndex = REEL_TABS.indexOf(tab);
  const contentIndex = REEL_TABS.indexOf(contentTab);
  const previousTab = REEL_TABS[contentIndex - 1];
  const nextTabPreview = REEL_TABS[contentIndex + 1];
  useEffect(() => {
    tabIndex.set(selectedIndex);
  }, [selectedIndex, tabIndex]);
  const uncoverFrame = useRef(0);
  // The cover shows the same poster the swipe just landed on, hiding the swap to the real list.
  useEffect(() => {
    if (swapCount === 0) return;
    const resetFrame = requestAnimationFrame(() => {
      translateX.set(0);
      isSwitching.set(false);
      uncoverFrame.current = requestAnimationFrame(() => setCoverTab(null));
    });
    return () => {
      cancelAnimationFrame(resetFrame);
      cancelAnimationFrame(uncoverFrame.current);
    };
  }, [swapCount, isSwitching, translateX]);
  const commitSwipe = (nextTab: ReelTab) => {
    setCoverTab(nextTab);
    setContentTab(nextTab);
    setSwapCount((count) => count + 1);
  };
  const selectTab = (nextTab: ReelTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    setContentTab(nextTab);
    setCoverTab(null);
    isSwitching.set(false);
    translateX.set(0);
  };
  const tabSwipe = usePanGesture({
    enabled: canSwipe,
    // Vertical movement fails this gesture first, so swiping between videos keeps working.
    activeOffsetX: [-16, 16],
    failOffsetY: [-12, 12],
    onActivate: (event) => {
      // Activation happens 16pt in; starting from there keeps the page from jumping.
      swipeStartX.set(event.translationX);
    },
    onUpdate: (event) => {
      const translationX = event.translationX - swipeStartX.get();
      const isPastEdge =
        (translationX > 0 && tabIndex.get() === 0) ||
        (translationX < 0 && tabIndex.get() === REEL_TABS.length - 1);
      translateX.set(translationX * (isPastEdge ? TAB_EDGE_RESISTANCE : 1));
    },
    // Runs on the UI thread so the page keeps its velocity even while JS is busy.
    onDeactivate: (event) => {
      const currentIndex = tabIndex.get();
      const nextIndex = getSwipedTabIndex({
        currentIndex,
        tabCount: REEL_TABS.length,
        translationX: event.canceled ? 0 : event.translationX - swipeStartX.get(),
        velocityX: event.velocityX,
        width,
      });
      const nextTab = REEL_TABS[nextIndex];
      if (!nextTab || nextIndex === currentIndex) {
        translateX.set(withSpring(0, { ...SHEET_CLOSE_SPRING, velocity: event.velocityX }));
        return;
      }
      const direction = nextIndex > currentIndex ? 1 : -1;
      isSwitching.set(true);
      tabIndex.set(nextIndex);
      scheduleOnRN(setTab, nextTab);
      translateX.set(
        withSpring(-direction * width, { ...SHEET_CLOSE_SPRING, velocity: event.velocityX }, (finished) => {
          if (finished) scheduleOnRN(commitSwipe, nextTab);
        }),
      );
    },
  });
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));
  // Thẻ video trong chat Tripi lấy từ bảng tin Dành cho bạn, nên mở đúng tab đó.
  useEffect(() => {
    if (!targetId) return;
    setIsSample(false);
    setTab('for_you');
    setContentTab('for_you');
    setCoverTab(null);
    isSwitching.set(false);
    translateX.set(0);
  }, [targetId, isSwitching, translateX]);

  if (isSample && DEMO_REELS.length > 0)
    return <ReelsFeed items={DEMO_REELS} isSample onExitSample={() => setIsSample(false)} />;
  return (
    <GestureHandlerRootView style={styles.screen}>
      <GestureDetector gesture={tabSwipe}>
        <Animated.View
          style={[styles.content, contentStyle]}
          onLayout={(event) => setContentSize(event.nativeEvent.layout)}
        >
          {previousTab && (
            <View style={[styles.preview, { left: -width, width }]} pointerEvents="none">
              <ReelsTabPreview tab={previousTab} playback={firstPlaybackOf(previousTab)} size={contentSize} />
            </View>
          )}
          {nextTabPreview && (
            <View style={[styles.preview, { left: width, width }]} pointerEvents="none">
              <ReelsTabPreview
                tab={nextTabPreview}
                playback={firstPlaybackOf(nextTabPreview)}
                size={contentSize}
              />
            </View>
          )}
          {contentTab === 'following' ? (
            <FollowingComingSoon />
          ) : (
            // A new key unmounts the old list, which releases its players so its video stops.
            <ReelsTabFeed
              key={contentTab}
              tab={contentTab}
              initialLayout={contentSize}
              targetId={contentTab === 'for_you' ? targetId : undefined}
              onTargetShown={clearTarget}
              onHiddenChange={setIsChromeHidden}
              onOpenSample={() => setIsSample(true)}
            />
          )}
        </Animated.View>
      </GestureDetector>
      {coverTab && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ReelsTabPreview tab={coverTab} playback={firstPlaybackOf(coverTab)} size={contentSize} />
        </View>
      )}
      <ReelsTabBar
        selected={tab}
        isHidden={isChromeHidden}
        onSelect={selectTab}
        onSearch={() => router.push({ pathname: '/(tabs)/explore', params: { autoFocus: '1' } })}
      />
    </GestureHandlerRootView>
  );
}

type FeedPages = ReturnType<typeof useReelsFeed>['data'];

function readPlaybacks(feedPages: FeedPages): ReelItem['playback'][] {
  return (feedPages?.pages.flatMap((page) => page.items) ?? []).flatMap((card) =>
    card.video?.hlsUrl ? [card.video] : [],
  );
}

/** Stands in for a tab's list while swiping, without the players a real list would create. */
function ReelsTabPreview({
  tab,
  playback,
  size,
}: {
  tab: ReelTab;
  playback?: ReelItem['playback'];
  size: { width: number; height: number };
}) {
  if (tab === 'following') return <FollowingComingSoon />;
  if (!playback || size.width === 0 || size.height === 0)
    return (
      <View style={styles.previewFrame}>
        <ActivityIndicator color={colors.background} accessibilityLabel={copy.loading} />
      </View>
    );
  const { box, contentFit } = layoutReelVideo(playback.aspect, size.width, size.height);
  return (
    <View
      style={styles.previewFrame}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={selectReelPoster(playback.posters, size.width)}
        cachePolicy="memory-disk"
        style={box}
        contentFit={contentFit}
      />
    </View>
  );
}

function FollowingComingSoon() {
  return (
    <View style={styles.message}>
      <Icon name="people-outline" color={colors.background} size={40} />
      <Txt variant="heading" style={styles.light}>
        {copy.followingSoonTitle}
      </Txt>
      <Txt style={styles.light}>{copy.followingSoonBody}</Txt>
      <Button onPress={() => router.push('/(tabs)/explore')}>{vi.api.search}</Button>
    </View>
  );
}

function ReelsTabFeed({
  tab,
  initialLayout,
  targetId,
  onTargetShown,
  onHiddenChange,
  onOpenSample,
}: {
  tab: ReelFeedTab;
  initialLayout: { width: number; height: number };
  targetId?: string;
  onTargetShown: () => void;
  onHiddenChange: (isHidden: boolean) => void;
  onOpenSample: () => void;
}) {
  const insets = useSafeAreaInsets();
  const feed = useReelsFeed({ tab });
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
  const items = useMemo(() => {
    // A hot post can move between pages when its score changes while the viewer scrolls.
    const seenPostIds = new Set<string>();
    return (feed.data?.pages.flatMap((page) => page.items) ?? [])
      .filter((card) => {
        if (!card.video?.hlsUrl || seenPostIds.has(card.postId)) return false;
        seenPostIds.add(card.postId);
        return true;
      })
      .map((card): ReelItem => ({
        id: card.postId,
        postId: card.postId,
        title: card.title,
        body: card.caption,
        playback: card.video,
        social: card,
      }));
  }, [feed.data]);

  const isTargetLoaded = !targetId || items.some((item) => item.postId === targetId);
  useEffect(() => {
    if (isTargetLoaded || !feed.hasNextPage || feed.isFetching || feed.isError) return;
    if ((feed.data?.pages.length ?? 0) >= MAX_JUMP_PAGES) return;
    void feed.fetchNextPage({ cancelRefetch: false });
  }, [isTargetLoaded, feed]);

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
  if (items.length > 0)
    return (
      <View style={{ flex: 1 }}>
        {!!feed.error && (
          <View style={[styles.errorBanner, { paddingTop: insets.top + spacing.sm + REELS_TAB_BAR_HEIGHT }]}>
            <ApiErrorNotice error={feed.error} retry={retryFeed} />
          </View>
        )}
        <ReelsFeed
          items={items}
          initialLayout={initialLayout}
          onHiddenChange={onHiddenChange}
          targetId={targetId}
          onTargetShown={onTargetShown}
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
    <View style={styles.message}>
      {feed.isPending ? (
        <Txt style={styles.light}>{feed.fetchStatus === 'paused' ? copy.offline : copy.loading}</Txt>
      ) : feed.error ? (
        <ApiErrorNotice error={feed.error} retry={retryFeed} />
      ) : (
        <>
          <Txt variant="heading" style={styles.light}>
            {copy.emptyTitle}
          </Txt>
          <Txt style={styles.light}>{copy.emptyBody}</Txt>
          <Button onPress={retryFeed}>{vi.api.retry}</Button>
          {feed.hasNextPage && (
            <Button tone="secondary" onPress={loadMore}>
              {vi.api.next}
            </Button>
          )}
          <Button
            tone="secondary"
            onPress={() => router.push({ pathname: '/(tabs)/explore', params: { autoFocus: '1' } })}
          >
            {vi.api.search}
          </Button>
        </>
      )}
      {DEMO_REELS.length > 0 && (
        <Button tone="secondary" onPress={onOpenSample}>
          {copy.openSample}
        </Button>
      )}
    </View>
  );
}

export function ReelsFeed({
  items,
  initialLayout = { width: 0, height: 0 },
  targetId,
  onTargetShown,
  isSample = false,
  onHiddenChange,
  onExitSample,
  onLoadMore,
  isFetchingMore = false,
  onRefresh,
  isRefreshing = false,
}: {
  items: readonly ReelItem[];
  initialLayout?: { width: number; height: number };
  targetId?: string;
  onTargetShown?: () => void;
  isSample?: boolean;
  onHiddenChange?: (isHidden: boolean) => void;
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
  // Known size means the list draws on its first frame, with no dark frame before onLayout.
  const [layout, setLayout] = useState(initialLayout);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const centeredIndex = useRef(0);
  const [pausedId, setPausedId] = useState<string | null>(null);
  const [heldId, setHeldId] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ id: string; attempt: number } | null>(null);
  const [hasComments, setHasComments] = useState(false);
  const currentIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const visibleIndex = Math.min(focusedIndex, Math.max(0, items.length - 1));
  const hideHeader = heldId !== null && heldId === items[visibleIndex]?.id;
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
    isPaused: pausedId === items[visibleIndex]?.id,
    isMuted: false,
    isDataLimited,
    retry,
  });

  useEffect(() => {
    if (layout.width === 0) return;
    const urls = getReelPosterPrefetchUrls(
      items.map((item) => item.playback.posters),
      visibleIndex,
      layout.width,
    );
    if (urls.length > 0) void Image.prefetch(urls, { cachePolicy: 'memory-disk' });
  }, [items, visibleIndex, layout.width]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setIsForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    onHiddenChange?.(hideHeader || hasComments);
  }, [hideHeader, hasComments, onHiddenChange]);

  const settle = useCallback((index: number) => {
    centeredIndex.current = index;
    setFocusedIndex(index);
    setActiveIndex(index);
  }, []);

  const list = useRef<FlatList<ReelItem>>(null);
  const targetIndex = targetId ? items.findIndex((item) => item.postId === targetId) : -1;
  useEffect(() => {
    if (targetIndex < 0 || layout.height === 0) return;
    // Danh sách chỉ dựng vài reel quanh chỗ đang xem, nên cuộn xa bị chặn ở cuối phần đã dựng;
    // cuộn lại qua vài khung hình để danh sách kịp dựng tiếp. onScroll tự cập nhật reel đang xem.
    let frame = 0;
    let attempts = 0;
    const jump = () => {
      list.current?.scrollToOffset({ offset: targetIndex * layout.height, animated: false });
      if (++attempts < 10) frame = requestAnimationFrame(jump);
      else onTargetShown?.();
    };
    jump();
    return () => cancelAnimationFrame(frame);
  }, [targetIndex, layout.height, onTargetShown]);

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
      setHeldId(null);
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
          ref={list}
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
          extraData={{ slots, pausedId, heldId, layout, isOffline, focusedIndex }}
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
                isHidden={heldId === item.id}
                isSample={isSample}
                onCommentsVisibilityChange={setHasComments}
                blockedReason={blockedReason}
                onToggle={() => setPausedId((id) => (id === item.id ? null : item.id))}
                onHoldChange={(isHeld) => setHeldId((id) => (isHeld ? item.id : id === item.id ? null : id))}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1 },
  preview: { position: 'absolute', top: 0, bottom: 0 },
  previewFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: mobileLayout.gutter,
    backgroundColor: colors.ink,
  },
  errorBanner: {
    gap: spacing.sm,
    paddingHorizontal: mobileLayout.gutter,
    paddingBottom: spacing.sm,
    backgroundColor: colors.ink,
  },
  light: { color: colors.background },
});
