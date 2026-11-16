import { layoutReelCommentsVideo, layoutReelVideo, selectReelPoster } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { VideoView, type VideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  useExclusiveGestures,
  useLongPressGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, Icon, Txt } from '@/components/mobile-ui';
import { ReelHeartBurst, type HeartBurstItem } from './reel-heart-burst';
import { ReelSeekBar } from './reel-seek-bar';
import { ReelSocialOverlay } from './reel-social-overlay';
import type { ReelItem } from './reel-types';

const copy = vi.mobile.reels;
/** Nhấn giữ thì xem nhanh gấp đôi, thả tay về tốc độ thường. */
const FAST_FORWARD_RATE = 2;
const HOLD_MS = 350;
/** Chạm đơn phải đợi chừng này để biết có chạm lần hai không, nên giữ ngắn. */
const DOUBLE_TAP_MS = 250;
const HEART_TILT_DEG = 15;

function setPlaybackRate(player: VideoPlayer, rate: number) {
  if (player.playbackRate === rate) return;
  const wasPlaying = player.playing;
  player.playbackRate = rate;
  if (!wasPlaying) player.pause();
}

function PlayerSurface({
  player,
  poster,
  contentFit,
  isPaused,
  shouldPlay,
  isMuted,
  onAttach,
  onFirstFrame,
  isHidden,
}: {
  player: VideoPlayer;
  poster: string;
  contentFit: 'cover' | 'contain';
  isPaused: boolean;
  shouldPlay: boolean;
  isMuted: boolean;
  onAttach?: () => void;
  onFirstFrame?: () => void;
  isHidden: boolean;
}) {
  const insets = useSafeAreaInsets();
  const videoView = useRef<VideoView>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack });
  const level = videoTrack ? Math.min(videoTrack.size.width, videoTrack.size.height) : null;
  // Reapply playback intent after the VideoView attaches, including cached/reused sources.
  useEffect(() => {
    onAttach?.();
  }, [onAttach]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !shouldPlay) return;
    const video: HTMLVideoElement | null | undefined = videoView.current?.nativeRef.current;
    if (!video) return;
    let isActive = true;
    // expo-video's web player.play() does not expose the browser's autoplay rejection.
    player.muted = isMuted || navigator.userActivation?.hasBeenActive === false;
    void video.play().catch((error: DOMException) => {
      if (!isActive || video.muted || error.name !== 'NotAllowedError') return;
      player.muted = true;
      void video.play().catch(() => {});
    });
    return () => {
      isActive = false;
      player.muted = true;
      video.pause();
    };
  }, [player, shouldPlay, isMuted]);
  useEffect(() => {
    if (hasFrame) onFirstFrame?.();
  }, [hasFrame, onFirstFrame]);
  return (
    <>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <VideoView
          ref={videoView}
          player={player}
          style={styles.video}
          contentFit={contentFit}
          surfaceType="textureView"
          nativeControls={false}
          playsInline
          onFirstFrameRender={() => setHasFrame(true)}
        />
        {!hasFrame && poster ? (
          <Image
            source={poster}
            cachePolicy="memory-disk"
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
          />
        ) : null}
      </View>
      {status === 'loading' && (
        <View pointerEvents="none" style={styles.center}>
          <ActivityIndicator color={colors.background} accessibilityLabel={copy.loading} />
        </View>
      )}
      {isPaused && status !== 'error' && (
        <View pointerEvents="none" style={styles.center}>
          <Icon name="play" color={colors.background} size={48} />
        </View>
      )}
      {__DEV__ && level !== null && !isHidden && (
        <View style={[styles.quality, { top: insets.top + 80 }]} pointerEvents="none">
          <Txt variant="caption" style={styles.light}>
            {t('mobile.reels.currentQuality', { level })}
          </Txt>
        </View>
      )}
    </>
  );
}

function VideoNotice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} pointerEvents="box-none">
      <View style={styles.notice}>
        <Txt style={styles.light}>{text}</Txt>
        {onRetry && <Button onPress={onRetry}>{copy.retry}</Button>}
      </View>
    </View>
  );
}

export function ReelSlide({
  item,
  player,
  width,
  height,
  isLoaded,
  hasError,
  isPaused,
  shouldPlay,
  isMuted,
  isHidden,
  isActive,
  blockedReason,
  isSample,
  onToggle,
  onHoldChange,
  onRetry,
  onAttach,
  onFirstFrame,
  onCommentsVisibilityChange,
}: {
  item: ReelItem;
  player?: VideoPlayer;
  width: number;
  height: number;
  isLoaded: boolean;
  hasError: boolean;
  isPaused: boolean;
  shouldPlay: boolean;
  isMuted: boolean;
  isHidden: boolean;
  isActive: boolean;
  blockedReason?: string;
  isSample: boolean;
  onToggle: () => void;
  onHoldChange: (isHeld: boolean) => void;
  onRetry: () => void;
  onAttach?: () => void;
  onFirstFrame?: () => void;
  onCommentsVisibilityChange: (visible: boolean) => void;
}) {
  const poster = selectReelPoster(item.playback.posters, width);
  const { box: videoBox, contentFit } = layoutReelVideo(item.playback.aspect, width, height);
  const held = useRef(false);
  const [isFastForward, setFastForward] = useState(false);
  const [hearts, setHearts] = useState<HeartBurstItem[]>([]);
  const nextHeart = useRef(0);
  const [likeRequest, setLikeRequest] = useState(0);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const commentsProgress = useSharedValue(0);
  const commentsVideo = layoutReelCommentsVideo({
    aspect: item.playback.aspect,
    slideWidth: width,
    windowHeight,
    topInset: insets.top + spacing.sm,
  });
  const stageStyle = useAnimatedStyle(() => {
    const progress = commentsProgress.get();
    return {
      width: interpolate(progress, [0, 1], [videoBox.width, commentsVideo.width], Extrapolation.CLAMP),
      height: interpolate(progress, [0, 1], [videoBox.height, commentsVideo.height], Extrapolation.CLAMP),
      left: interpolate(
        progress,
        [0, 1],
        [(width - videoBox.width) / 2, commentsVideo.left],
        Extrapolation.CLAMP,
      ),
      top: interpolate(
        progress,
        [0, 1],
        [(height - videoBox.height) / 2, commentsVideo.top],
        Extrapolation.CLAMP,
      ),
    };
  });
  const blackBackdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, commentsProgress.get())),
  }));
  // Chỉ chạm vào tốc độ khi nó thật sự đổi: trên iOS, gán playbackRate là đặt rate của AVPlayer,
  // nên player đang dừng (video tải sẵn trên dưới) sẽ tự phát ngầm và làm lướt bị giật.
  const isFast = !!player && isFastForward && isActive;
  useEffect(() => {
    if (!player || !isFast) return;
    setPlaybackRate(player, FAST_FORWARD_RATE);
    // Thả tay, rời reel hay đổi player đều trả về tốc độ thường.
    return () => setPlaybackRate(player, 1);
  }, [player, isFast]);
  const likeAt = (x: number, y: number) => {
    const id = nextHeart.current++;
    const tilt = (Math.random() * 2 - 1) * HEART_TILT_DEG;
    setHearts((list) => [...list, { id, x, y, tilt }]);
    setLikeRequest((count) => count + 1);
  };
  const removeHeart = useCallback(
    (id: number) => setHearts((list) => list.filter((heart) => heart.id !== id)),
    [],
  );
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    maxDelay: DOUBLE_TAP_MS,
    runOnJS: true,
    onActivate: (event) => likeAt(event.x, event.y),
  });
  const singleTap = useTapGesture({ runOnJS: true, onActivate: () => onToggle() });
  const hold = useLongPressGesture({
    minDuration: HOLD_MS,
    runOnJS: true,
    onActivate: () => {
      held.current = true;
      setFastForward(true);
      onHoldChange(true);
    },
    onFinalize: () => {
      if (!held.current) return;
      held.current = false;
      setFastForward(false);
      onHoldChange(false);
    },
  });
  // Chạm đúp thắng chạm đơn; nhấn giữ đủ lâu thì thắng cả hai.
  const surfaceGesture = useCompetingGestures(hold, useExclusiveGestures(doubleTap, singleTap));
  return (
    <View
      testID={`reel-${item.id}`}
      style={[styles.slide, { width, height }]}
      accessibilityElementsHidden={!isActive}
      aria-hidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
    >
      {!!poster && (videoBox.width < width || videoBox.height < height) && (
        <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={25} />
      )}
      <Animated.View style={[styles.blackBackdrop, blackBackdropStyle]} pointerEvents="none" />
      <GestureDetector gesture={surfaceGesture}>
        <View
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isPaused ? copy.play : copy.pause}
          accessibilityHint={copy.holdToHide}
          accessibilityActions={[{ name: 'activate' }, { name: 'like', label: copy.doubleTapLike }]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'like') setLikeRequest((count) => count + 1);
            else onToggle();
          }}
        />
      </GestureDetector>
      <Animated.View style={[styles.stage, stageStyle]} pointerEvents="box-none">
        {player && isLoaded ? (
          <PlayerSurface
            key={`${item.id}:${item.playback.hlsUrl}`}
            player={player}
            poster={poster}
            contentFit={contentFit}
            isPaused={isPaused}
            shouldPlay={shouldPlay}
            isMuted={isMuted}
            onAttach={onAttach}
            onFirstFrame={onFirstFrame}
            isHidden={isActive && isHidden}
          />
        ) : poster ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image
              source={poster}
              cachePolicy="memory-disk"
              style={StyleSheet.absoluteFill}
              contentFit={contentFit}
            />
          </View>
        ) : null}
      </Animated.View>
      {blockedReason ? (
        <VideoNotice text={blockedReason} />
      ) : hasError ? (
        <VideoNotice text={copy.failed} onRetry={onRetry} />
      ) : !isLoaded ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.background} accessibilityLabel={copy.loading} />
        </View>
      ) : null}
      <ReelSocialOverlay
        item={item}
        isActive={isActive}
        isSample={isSample}
        isHidden={isActive && isHidden}
        commentsProgress={commentsProgress}
        likeRequest={likeRequest}
        onCommentsVisibilityChange={onCommentsVisibilityChange}
      />
      {player && isLoaded && isActive && !blockedReason && !hasError && (
        <ReelSeekBar
          player={player}
          width={width}
          commentsProgress={commentsProgress}
          onScrubChange={onHoldChange}
        />
      )}
      {isFastForward && isActive && (
        <View style={[styles.fastForward, { top: insets.top + spacing.lg }]} pointerEvents="none">
          <Icon name="play-forward" size={16} color={colors.background} />
          <Txt variant="label" style={styles.light}>
            {copy.fastForward}
          </Txt>
        </View>
      )}
      {hearts.map((heart) => (
        <ReelHeartBurst key={heart.id} burst={heart} onDone={removeHeart} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  video: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  stage: { position: 'absolute' },
  blackBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  quality: {
    position: 'absolute',
    top: spacing.xl,
    // The mute button now sits at the top right, directly below the tabs.
    left: spacing.lg,
    backgroundColor: colors.overlayHeavy,
    padding: spacing.sm,
  },
  slide: { backgroundColor: colors.ink, overflow: 'hidden' },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  notice: { padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.overlayHeavy },
  light: { color: colors.background },
  fastForward: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
});
