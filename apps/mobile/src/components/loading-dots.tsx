import { vi } from '@tripflix/i18n';
import { explorer as x, spacing } from '@tripflix/tokens';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DOT_COUNT = 3;
const BOUNCE_MS = 280;
const STAGGER_MS = 140;

/** Ba chấm nhảy thay cho chữ "Đang tải…"; trình đọc màn hình vẫn đọc "Đang tải". */
export function LoadingDots({ color = x.day.textSecondary }: { color?: string }) {
  return (
    <View style={styles.row} accessible accessibilityRole="progressbar" accessibilityLabel={vi.api.loading}>
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <Dot key={index} delayMs={index * STAGGER_MS} color={color} />
      ))}
    </View>
  );
}

function Dot({ delayMs, color }: { delayMs: number; color: string }) {
  const offset = useSharedValue(0);
  useEffect(() => {
    offset.set(
      withDelay(
        delayMs,
        withRepeat(
          withSequence(withTiming(-6, { duration: BOUNCE_MS }), withTiming(0, { duration: BOUNCE_MS })),
          -1,
        ),
      ),
    );
  }, [delayMs, offset]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
