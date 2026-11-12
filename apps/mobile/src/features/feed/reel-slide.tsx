import { layoutReelCommentsVideo, layoutReelVideo, selectReelPoster } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { VideoView, type VideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Button, Icon, Txt } from '@/components/mobile-ui';
import { ReelSocialOverlay } from './reel-social-overlay';
import type { ReelItem } from './reel-types';

const copy = vi.mobile.reels;

function PlayerSurface({
  player,
  item,
  width,
  height,
  isPaused,
  onRetry,
  onAttach,
  isHidden,
}: {
  player: VideoPlayer;
  item: ReelItem;
  width: number;
  height: number;
  isPaused: boolean;
  onRetry: () => void;
  onAttach?: () => void;
  isHidden: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [hasFrame, setHasFrame] = useState(false);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack });
  const level = videoTrack ? Math.min(videoTrack.size.width, videoTrack.size.height) : null;
  const poster = selectReelPoster(item.playback.posters, width);
  const { box, contentFit } = layoutReelVideo(item.playback.aspect, width, height);
  // Reapply playback intent after the VideoView attaches, including cached/reused sources.
  useEffect(() => {
    onAttach?.();
  }, [onAttach]);
  return (
    <>
      <View style={styles.videoLayer} pointerEvents="none">
        <View style={box}>
          <VideoView
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
      {status === 'error' && <VideoNotice text={copy.failed} onRetry={onRetry} />}
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
  isHidden,
  isActive,
  blockedReason,
  isSample,
  onToggle,
  onHoldChange,
  onRetry,
  onAttach,
  onCommentsVisibilityChange,
}: {
  item: ReelItem;
  player?: VideoPlayer;
  width: number;
  height: number;
  isLoaded: boolean;
  hasError: boolean;
  isPaused: boolean;
  isHidden: boolean;
  isActive: boolean;
  blockedReason?: string;
  isSample: boolean;
  onToggle: () => void;
  onHoldChange: (isHeld: boolean) => void;
  onRetry: () => void;
  onAttach?: () => void;
  onCommentsVisibilityChange: (visible: boolean) => void;
}) {
  const poster = selectReelPoster(item.playback.posters, width);
  const { box: videoBox, contentFit } = layoutReelVideo(item.playback.aspect, width, height);
  const held = useRef(false);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const commentsProgress = useSharedValue(0);
  const commentsVideo = layoutReelCommentsVideo({
    windowHeight,
    slideHeight: height,
    topInset: insets.top,
  });
  const stageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(commentsProgress.get(), [0, 1], [0, commentsVideo.translateY]) },
      { scale: interpolate(commentsProgress.get(), [0, 1], [1, commentsVideo.scale]) },
    ],
  }));
  return (
    <View
      testID={`reel-${item.id}`}
      style={[styles.slide, { width, height }]}
      accessibilityElementsHidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[StyleSheet.absoluteFill, stageStyle]} pointerEvents="none">
        {!!poster && (videoBox.width < width || videoBox.height < height) && (
          <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={25} />
        )}
        {!isLoaded && poster ? (
          <View style={styles.videoLayer}>
            <Image source={poster} cachePolicy="memory-disk" style={videoBox} contentFit={contentFit} />
          </View>
        ) : null}
      </Animated.View>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={isPaused ? copy.play : copy.pause}
        accessibilityHint={copy.holdToHide}
        delayLongPress={350}
        onPressIn={() => {
          held.current = false;
        }}
        onLongPress={() => {
          held.current = true;
          onHoldChange(true);
        }}
        onPressOut={() => {
          if (held.current) onHoldChange(false);
        }}
        onPress={() => {
          if (!held.current) onToggle();
        }}
      />
      {player && isLoaded && (
        <Animated.View style={[StyleSheet.absoluteFill, stageStyle]} pointerEvents="box-none">
          <PlayerSurface
            key={`${item.id}:${item.playback.hlsUrl}`}
            player={player}
            item={item}
            width={width}
            height={height}
            isPaused={isPaused}
            onRetry={onRetry}
            onAttach={onAttach}
            isHidden={isActive && isHidden}
          />
        </Animated.View>
      )}
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
        onCommentsVisibilityChange={onCommentsVisibilityChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  video: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  videoLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
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
});
