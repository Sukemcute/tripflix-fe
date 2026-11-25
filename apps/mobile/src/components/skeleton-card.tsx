import { vi } from '@tripflix/i18n';
import { explorer as x, radius, spacing } from '@tripflix/tokens';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const PULSE_MS = 900;

/**
 * Khung xám giữ chỗ cho thẻ kết quả (ảnh 16:9 + nhãn + tiêu đề) trong lúc tải: người dùng thấy ngay bố cục sắp
 * hiện ra thay vì một trang trống có ba chấm. Nhấp nháy nhẹ, tắt khi máy bật giảm chuyển động.
 */
export function SkeletonCards({ count = 2 }: { count?: number }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    pulse.set(
      withRepeat(withTiming(0.55, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [reducedMotion, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={vi.api.loading} style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <Animated.View key={index} style={[styles.card, style]}>
          <View style={styles.photo} />
          <View style={[styles.line, styles.badge]} />
          <View style={styles.line} />
          <View style={[styles.line, styles.short]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: x.day.line },
  line: { height: 14, width: '85%', borderRadius: radius.sm, backgroundColor: x.day.line },
  badge: { width: 72, height: 20, borderRadius: radius.pill },
  short: { width: '50%' },
});
