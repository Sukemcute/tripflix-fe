import { vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts as f, radius, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Txt } from '@/components/mobile-ui';
import {
  TRIPI_ANIMATIONS,
  TRIPI_ASSETS,
  type TripiAnimation,
  type TripiPose,
} from '@/features/mascot/tripi-assets';

const copy = vi.assistant;

/** Cỡ chữ của khung chat sau khi thiết kế lại: dễ đọc hơn bộ compact 12px cũ (SCRUM-167). */
export const chatType = {
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 19 },
  meta: { fontSize: 12, lineHeight: 17 },
  title: { fontSize: 17, lineHeight: 24 },
} as const;

/** Tripi dạng ảnh động (webp) hoặc dáng tĩnh; giảm chuyển động thì luôn dùng dáng tĩnh. */
export function TripiFace({
  animation,
  pose = 'expr-curious',
  size,
  style,
}: {
  animation?: TripiAnimation;
  pose?: TripiPose;
  size: number;
  style?: ViewStyle;
}) {
  const reducedMotion = useReducedMotion();
  const motion = animation ? TRIPI_ANIMATIONS[animation] : undefined;
  const source = motion && !reducedMotion ? motion.source : TRIPI_ASSETS[motion?.fallback ?? pose].source;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.face, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Image source={source} contentFit="contain" style={{ width: size * 0.92, height: size * 0.92 }} />
    </View>
  );
}

function Dot({ index, isStill }: { index: number; isStill: boolean }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    if (isStill) return;
    lift.set(
      withDelay(
        index * 140,
        withRepeat(
          withSequence(withTiming(-5, { duration: 280 }), withTiming(0, { duration: 280 })),
          -1,
          false,
          undefined,
          ReduceMotion.System,
        ),
      ),
    );
  }, [index, isStill, lift]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }] }));
  return <Animated.View style={[styles.dot, { opacity: 0.45 + index * 0.25 }, motion]} />;
}

/** Tripi đang nghĩ: ảnh động "đang tìm", ba chấm nhảy và câu trạng thái đổi dần. */
export function AssistantThinking() {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % copy.thinkingSteps.length), 1800);
    return () => clearInterval(timer);
  }, [reducedMotion]);
  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel={copy.thinking} style={styles.thinkingRow}>
      <TripiFace animation="searching" size={52} />
      <View style={styles.thinkingBubble}>
        <View style={styles.dots}>
          {[0, 1, 2].map((index) => (
            <Dot key={index} index={index} isStill={reducedMotion} />
          ))}
        </View>
        <Animated.View key={step} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
          <Txt style={styles.thinkingText}>{copy.thinkingSteps[step]}</Txt>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', backgroundColor: x.day.canvas },
  thinkingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm },
  thinkingBubble: {
    flexShrink: 1,
    gap: s.xs,
    paddingVertical: s.md,
    paddingHorizontal: s.lg,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    backgroundColor: x.day.canvas,
    borderWidth: 1,
    borderColor: x.day.line,
  },
  dots: { flexDirection: 'row', gap: 5, height: 12, alignItems: 'flex-end' },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: x.brand.coral },
  thinkingText: { ...chatType.small, fontFamily: f.medium, color: x.day.textSecondary },
});
