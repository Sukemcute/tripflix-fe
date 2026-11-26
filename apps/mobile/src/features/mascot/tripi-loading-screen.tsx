import { vi } from '@tripflix/i18n';
import { explorer as x, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Txt } from '@/components/mobile-ui';
import { LoadingDots } from '@/components/loading-dots';
import { TRIPI_ANIMATIONS, TRIPI_ASSETS } from './tripi-assets';

const copy = vi.mobile.loading;
const TRIPI_SIZE = 250;
const GLOW_MS = 2_800;
const TIP_MS = 2_600;

/**
 * Màn chờ khi app đang mở: Tripi bước đi tại chỗ (vòng bước từ rig Rive, TF71) trước quầng hoàng hôn phồng nhẹ,
 * kèm mẹo dùng app đổi lần lượt. Vòng bước đã tự nhún theo nhịp chân nên không nhún thêm cả người.
 */
export function TripiLoadingScreen() {
  const reducedMotion = useReducedMotion();
  const glow = useSharedValue(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    glow.set(withRepeat(withTiming(1, { duration: GLOW_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reducedMotion, glow]);

  useEffect(() => {
    const timer = setInterval(() => setTipIndex((index) => (index + 1) % copy.tips.length), TIP_MS);
    return () => clearInterval(timer);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + glow.get() * 0.12 }],
    opacity: 0.28 + glow.get() * 0.17,
  }));

  const motion = TRIPI_ANIMATIONS.walking;
  const source = reducedMotion ? TRIPI_ASSETS[motion.fallback].source : motion.source;

  return (
    <View style={styles.screen} accessible accessibilityRole="progressbar" accessibilityLabel={copy.title}>
      <View style={styles.stage}>
        <Animated.View style={[styles.glow, glowStyle]}>
          <LinearGradient colors={x.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
        </Animated.View>
        <Image
          source={source}
          contentFit="contain"
          accessible={false}
          style={{ width: TRIPI_SIZE, height: TRIPI_SIZE }}
        />
      </View>
      <Txt variant="heading" style={styles.title}>
        {copy.title}
      </Txt>
      <Animated.View
        key={tipIndex}
        entering={FadeIn.duration(320).reduceMotion(ReduceMotion.System)}
        style={styles.tip}
      >
        <Txt variant="small" style={styles.tipText}>
          {copy.tips[tipIndex]}
        </Txt>
      </Animated.View>
      <LoadingDots color={x.action.primary} />
    </View>
  );
}

const GLOW_SIZE = 190;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: x.day.surface,
  },
  // Tripi to hơn quầng sáng để tràn ra ngoài vòng tròn, trông nổi hơn là nằm gọn trong một huy hiệu.
  stage: {
    width: TRIPI_SIZE,
    height: TRIPI_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    overflow: 'hidden',
  },
  fill: { flex: 1 },
  title: { textAlign: 'center' },
  tip: { minHeight: 22 },
  tipText: { color: x.day.textSecondary, textAlign: 'center' },
});
