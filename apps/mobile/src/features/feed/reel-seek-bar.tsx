import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, spacing } from '@tripflix/tokens';
import type { VideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Txt } from '@/components/mobile-ui';
import { CHROME_FADE, SNAP_SPRING } from '@/components/motion';

const copy = vi.mobile.reels;
/** Vùng chạm ở đáy reel. Caption nằm trên vùng này nên không bị thanh tua lấy mất lần chạm. */
export const SEEK_BAR_ZONE = 24;
const TIME_UPDATE_SECONDS = 0.25;
const LINE_HEIGHT = 2;
const SCRUB_LINE_HEIGHT = 4;
const THUMB_SIZE = 12;
const A11Y_STEP_SECONDS = 5;
// Thời gian giữa hai lần báo vị trí: thanh chạy đều theo đường thẳng, không nhảy từng nấc.
const FOLLOW = {
  duration: TIME_UPDATE_SECONDS * 1000,
  easing: Easing.linear,
  reduceMotion: ReduceMotion.System,
};

export function formatPlaybackTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Thanh tua mảnh ở đáy reel đang xem. Vuốt ngang để tua: thanh dày lên, hiện giờ đang tua,
 * thả tay mới nhảy video tới đó. Mờ đi cùng caption khi mở bình luận.
 */
export function ReelSeekBar({
  player,
  width,
  commentsProgress,
  onScrubChange,
}: {
  player: VideoPlayer;
  width: number;
  commentsProgress: SharedValue<number>;
  onScrubChange: (isScrubbing: boolean) => void;
}) {
  const progress = useSharedValue(0);
  const scrub = useSharedValue(0);
  const isScrubbing = useSharedValue(false);
  const startProgress = useSharedValue(0);
  const shownSecond = useSharedValue(-1);
  const [scrubSecond, setScrubSecond] = useState<number | null>(null);
  const [duration, setDuration] = useState(player.duration);
  const durationValue = useSharedValue(player.duration);

  useEffect(() => {
    const previousInterval = player.timeUpdateEventInterval;
    player.timeUpdateEventInterval = TIME_UPDATE_SECONDS;
    const sync = (currentTime: number) => {
      const total = player.duration;
      if (total > 0) {
        setDuration(total);
        durationValue.set(total);
      }
      if (isScrubbing.get() || !(total > 0)) return;
      const next = Math.min(1, currentTime / total);
      // Video lặp về đầu: đặt thẳng, không cho thanh chạy lùi qua cả video.
      progress.set(next < progress.get() - 0.05 ? next : withTiming(next, FOLLOW));
    };
    sync(player.currentTime);
    const subscription = player.addListener('timeUpdate', ({ currentTime }) => sync(currentTime));
    return () => {
      subscription.remove();
      player.timeUpdateEventInterval = previousInterval;
    };
  }, [player, progress, isScrubbing, durationValue]);

  const seekTo = (fraction: number) => {
    const total = player.duration;
    if (total > 0) player.currentTime = fraction * total;
  };
  const endScrub = (fraction: number, shouldSeek: boolean) => {
    if (shouldSeek) seekTo(fraction);
    setScrubSecond(null);
    onScrubChange(false);
  };
  const showSecond = (second: number) => setScrubSecond(second);

  const pan = usePanGesture({
    // Ngang 4pt là tua; dọc thì nhường cho vuốt sang video khác.
    activeOffsetX: [-4, 4],
    failOffsetY: [-12, 12],
    onActivate: (event) => {
      // Bắt đầu từ chỗ thanh đang đứng, trừ đoạn ngón tay đã đi trước khi nhận, nên thanh không nhảy.
      startProgress.set(progress.get() - event.translationX / width);
      isScrubbing.set(true);
      shownSecond.set(-1);
      scrub.set(withTiming(1, SNAP_SPRING));
      scheduleOnRN(onScrubChange, true);
    },
    onUpdate: (event) => {
      const next = Math.max(0, Math.min(1, startProgress.get() + event.translationX / width));
      progress.set(next);
      const second = Math.floor(next * durationValue.get());
      if (second !== shownSecond.get()) {
        shownSecond.set(second);
        scheduleOnRN(showSecond, second);
      }
    },
    onDeactivate: (event) => {
      scrub.set(withTiming(0, CHROME_FADE));
      isScrubbing.set(false);
      scheduleOnRN(endScrub, progress.get(), !event.canceled);
    },
  });

  const rootStyle = useAnimatedStyle(() => ({
    opacity: interpolate(commentsProgress.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));
  const trackStyle = useAnimatedStyle(() => ({
    height: interpolate(scrub.get(), [0, 1], [LINE_HEIGHT, SCRUB_LINE_HEIGHT]),
    opacity: interpolate(scrub.get(), [0, 1], [0.7, 1]),
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: progress.get() * width }));
  const thumbStyle = useAnimatedStyle(() => ({
    opacity: scrub.get(),
    transform: [{ translateX: progress.get() * width - THUMB_SIZE / 2 }, { scale: scrub.get() }],
  }));

  const onAccessibilityAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    const step = nativeEvent.actionName === 'increment' ? A11Y_STEP_SECONDS : -A11Y_STEP_SECONDS;
    if (duration > 0) player.currentTime = Math.max(0, Math.min(duration, player.currentTime + step));
  };

  return (
    <>
      {scrubSecond !== null && (
        <View style={styles.timeWrap} pointerEvents="none">
          <Txt style={styles.time}>
            {formatPlaybackTime(scrubSecond)}
            <Txt style={[styles.time, styles.timeTotal]}> / {formatPlaybackTime(duration)}</Txt>
          </Txt>
        </View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.zone, rootStyle]}
          testID="reel-seek-bar"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={copy.seek}
          accessibilityValue={{
            text: t('mobile.reels.seekValue', {
              current: formatPlaybackTime(player.currentTime),
              total: formatPlaybackTime(duration),
            }),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <Animated.View style={[styles.track, trackStyle]}>
            <View style={styles.rest} />
            <Animated.View style={[styles.fill, fillStyle]} />
          </Animated.View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SEEK_BAR_ZONE,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xs,
  },
  track: { overflow: 'hidden' },
  rest: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, opacity: 0.3 },
  fill: { height: '100%', backgroundColor: colors.background },
  thumb: {
    position: 'absolute',
    left: 0,
    bottom: spacing.xs + SCRUB_LINE_HEIGHT / 2 - THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.background,
  },
  timeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SEEK_BAR_ZONE + spacing.xl,
    alignItems: 'center',
  },
  time: {
    color: colors.background,
    fontFamily: nativeFonts.semibold,
    fontSize: 28,
    lineHeight: 34,
    textShadowColor: colors.overlayHeavy,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeTotal: { opacity: 0.7 },
});
