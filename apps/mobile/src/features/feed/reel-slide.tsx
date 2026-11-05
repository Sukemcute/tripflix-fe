import { fitReelVideo, selectReelPoster } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { VideoView, type VideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
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
  const box = fitReelVideo(item.playback.aspect, width, height);
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
            contentFit="contain"
            surfaceType="textureView"
            nativeControls={false}
            playsInline
            onFirstFrameRender={() => setHasFrame(true)}
          />
          {!hasFrame && poster ? (
            <Image source={poster} style={StyleSheet.absoluteFill} contentFit="contain" />
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
        <View style={[styles.quality, { top: insets.top + 64 }]} pointerEvents="none">
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
  isMuted,
  isActive,
  blockedReason,
  isSample,
  onToggle,
  onMute,
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
  isMuted: boolean;
  isActive: boolean;
  blockedReason?: string;
  isSample: boolean;
  onToggle: () => void;
  onMute: () => void;
  onRetry: () => void;
  onAttach?: () => void;
  onCommentsVisibilityChange: (visible: boolean) => void;
}) {
  const poster = selectReelPoster(item.playback.posters, width);
  const [isHidden, setIsHidden] = useState(false);
  const held = useRef(false);
  return (
    <View
      testID={`reel-${item.id}`}
      style={[styles.slide, { width, height }]}
      accessibilityElementsHidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
    >
      {item.playback.aspect === '16:9' && !!poster && (
        <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={25} />
      )}
      {!isLoaded && poster ? (
        <View style={styles.videoLayer}>
          <Image
            source={poster}
            style={fitReelVideo(item.playback.aspect, width, height)}
            contentFit="contain"
          />
        </View>
      ) : null}
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
          setIsHidden(true);
        }}
        onPressOut={() => setIsHidden(false)}
        onPress={() => {
          if (!held.current) onToggle();
        }}
      />
      {player && isLoaded && (
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
        isMuted={isMuted}
        isHidden={isActive && isHidden}
        onMute={onMute}
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
    right: spacing.lg,
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
