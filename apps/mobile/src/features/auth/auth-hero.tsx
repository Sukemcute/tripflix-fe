import { vi } from '@tripflix/i18n';
import { explorer as x, mobileLayout, nativeFonts } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Txt } from '@/components/mobile-ui';
import {
  TRIPI_ANIMATIONS,
  TRIPI_ASSETS,
  type TripiAnimation,
  type TripiPose,
} from '@/features/mascot/tripi-assets';

/** Việc người dùng đang làm trên form, để Tripi phản ứng theo. */
export type AuthMood = keyof typeof vi.api.mobileAuthTripi;

/** Tripi ứng với từng tâm trạng: ảnh động khi có, dáng tĩnh khi không (hoặc khi giảm chuyển động). */
const MOOD_TRIPI: Record<AuthMood, { animation?: TripiAnimation; pose: TripiPose }> = {
  hello: { animation: 'greeting', pose: 'hero-welcome' },
  register: { animation: 'excited', pose: 'expr-excited' },
  booking: { animation: 'departure', pose: 'action-depart' },
  email: { animation: 'curious', pose: 'expr-curious' },
  // Nét riêng của Tripflix: gõ mật khẩu thì Tripi quay lưng, hiện mật khẩu thì Tripi giật mình.
  password: { pose: 'turn-back' },
  peek: { pose: 'expr-surprised' },
  busy: { animation: 'searching', pose: 'ui-searching' },
  error: { pose: 'expr-overload' },
};

const FLIGHT_MS = 7_000;
const FLOAT_MS = 1_700;

/**
 * Đầu trang đăng nhập: trời xanh nhạt, mặt trời hoàng hôn của logo, mây trôi, máy bay bay ngang,
 * Tripi lơ lửng nói một câu đổi theo việc đang làm. Giảm chuyển động thì cảnh đứng yên, Tripi dùng dáng tĩnh.
 */
export function AuthHero({
  mood,
  title,
  accent,
  body,
  isCompact,
  back,
}: {
  mood: AuthMood;
  title: string;
  /** Dòng tiêu đề thứ hai tô màu nhấn; bỏ trống thì tiêu đề chỉ một màu. */
  accent?: string;
  body: string;
  isCompact: boolean;
  back: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const height = isCompact ? 210 : 270;
  const tripiSize = isCompact ? 116 : 150;
  const float = useSharedValue(0);
  const flight = useSharedValue(0);
  const drift = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    const sine = Easing.inOut(Easing.sin);
    float.set(withRepeat(withTiming(1, { duration: FLOAT_MS, easing: sine }), -1, true));
    flight.set(withRepeat(withTiming(1, { duration: FLIGHT_MS, easing: Easing.linear }), -1, false));
    drift.set(withRepeat(withTiming(1, { duration: 5_200, easing: sine }), -1, true));
    glow.set(withRepeat(withTiming(1, { duration: 2_600, easing: sine }), -1, true));
  }, [reducedMotion, float, flight, drift, glow]);

  const tripi = MOOD_TRIPI[mood];
  const source =
    tripi.animation && !reducedMotion
      ? TRIPI_ANIMATIONS[tripi.animation].source
      : TRIPI_ASSETS[tripi.pose].source;
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.get() }] }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - 0.18 * float.get() }],
    opacity: 0.12 - 0.05 * float.get(),
  }));
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.05 * glow.get() }] }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.15 + 0.15 * glow.get() }],
    opacity: 0.35 - 0.2 * glow.get(),
  }));
  // Máy bay bay vòng cung từ trái sang phải phía trên tiêu đề, mờ dần ở hai đầu.
  const planeStyle = useAnimatedStyle(() => {
    const p = flight.get();
    return {
      opacity: p < 0.08 ? p / 0.08 : p > 0.9 ? (1 - p) / 0.1 : 1,
      transform: [
        { translateX: -40 + p * (width + 80) },
        { translateY: 40 - Math.sin(p * Math.PI) * 26 },
        { rotate: `${12 - p * 24}deg` },
      ],
    };
  });
  const cloudA = useAnimatedStyle(() => ({ transform: [{ translateX: -14 + 28 * drift.get() }] }));
  const cloudB = useAnimatedStyle(() => ({ transform: [{ translateX: 12 - 24 * drift.get() }] }));

  return (
    <View
      style={[styles.hero, { height: height + insets.top, marginTop: -insets.top, paddingTop: insets.top }]}
    >
      <LinearGradient
        colors={[x.day.tintExplore, x.day.canvas]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
        <Animated.View style={[styles.halo, { top: insets.top + 18 }, haloStyle]} />
        <Animated.View style={[styles.sun, { top: insets.top + 30 }, sunStyle]}>
          <LinearGradient colors={x.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
        </Animated.View>
        <Animated.View style={[styles.cloud, { top: insets.top + 92, right: 92 }, cloudA]}>
          <Cloud scale={1} />
        </Animated.View>
        <Animated.View style={[styles.cloud, { top: insets.top + 66, right: 4, opacity: 0.8 }, cloudB]}>
          <Cloud scale={0.7} />
        </Animated.View>
        {!reducedMotion && (
          <Animated.View style={[styles.plane, { top: insets.top + 6 }, planeStyle]}>
            <Icon name="airplane" size={20} color={x.day.link} />
          </Animated.View>
        )}
        <Sparkle top={insets.top + 70} left={width * 0.42} delay={0} isStill={reducedMotion} />
        <Sparkle top={insets.top + 22} left={width * 0.58} delay={700} isStill={reducedMotion} />
        <Sparkle top={insets.top + 128} left={width - 34} delay={1_300} isStill={reducedMotion} />
      </View>

      <View style={styles.back}>{back}</View>

      <View style={[styles.stage, { width: tripiSize + 24 }]} accessibilityElementsHidden>
        <Animated.View style={[styles.shadow, { width: tripiSize * 0.55 }, shadowStyle]} />
        <Animated.View style={floatStyle}>
          <Animated.View key={mood} entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)}>
            <Image source={source} contentFit="contain" style={{ width: tripiSize, height: tripiSize }} />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View
        key={`bubble-${mood}`}
        entering={FadeInDown.duration(240).reduceMotion(ReduceMotion.System)}
        style={[styles.bubble, { bottom: tripiSize + 40, right: tripiSize * 0.45 }]}
        accessibilityLiveRegion="polite"
      >
        <Txt style={styles.bubbleText}>{vi.api.mobileAuthTripi[mood]}</Txt>
        <View style={styles.bubbleTail} />
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(320).reduceMotion(ReduceMotion.System)}
        style={[styles.copy, { right: tripiSize + 4 }]}
      >
        <Txt accessibilityRole="header" style={[styles.title, isCompact && styles.titleCompact]}>
          {title}
          {accent ? (
            <Txt style={[styles.title, isCompact && styles.titleCompact, styles.accent]}>{'\n' + accent}</Txt>
          ) : null}
        </Txt>
        <Txt style={styles.body}>{body}</Txt>
      </Animated.View>
    </View>
  );
}

/** Đám mây bồng: ba vòng tròn trắng chồng lên nhau trên một đáy phẳng. */
function Cloud({ scale }: { scale: number }) {
  const puff = (size: number, left: number, bottom: number) => (
    <View
      style={[
        styles.puff,
        { width: size * scale, height: size * scale, left: left * scale, bottom: bottom * scale },
      ]}
    />
  );
  return (
    <View style={{ width: 84 * scale, height: 40 * scale }}>
      {puff(30, 4, 0)}
      {puff(40, 22, 2)}
      {puff(28, 52, 0)}
      <View style={[styles.cloudBase, { height: 16 * scale, borderRadius: 8 * scale }]} />
    </View>
  );
}

/** Ngôi sao nhỏ nhấp nháy lệch nhịp nhau. */
function Sparkle({
  top,
  left,
  delay,
  isStill,
}: {
  top: number;
  left: number;
  delay: number;
  isStill: boolean;
}) {
  const twinkle = useSharedValue(0.6);
  useEffect(() => {
    if (isStill) return;
    twinkle.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(1, { duration: 700 }), withTiming(0.25, { duration: 900 })),
          -1,
          false,
        ),
      ),
    );
  }, [delay, isStill, twinkle]);
  const style = useAnimatedStyle(() => ({
    opacity: twinkle.get(),
    transform: [{ scale: 0.75 + 0.35 * twinkle.get() }],
  }));
  return (
    <Animated.View style={[styles.sparkle, { top, left }, style]}>
      <Icon name="sparkles" size={14} color={x.brand.sun} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
  fill: { flex: 1 },
  halo: {
    position: 'absolute',
    right: 18,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: x.brand.sun,
  },
  sun: { position: 'absolute', right: 30, width: 96, height: 96, borderRadius: 48, overflow: 'hidden' },
  cloud: { position: 'absolute', opacity: 0.92 },
  puff: { position: 'absolute', borderRadius: x.radius.pill, backgroundColor: x.brand.white },
  cloudBase: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: x.brand.white },
  plane: { position: 'absolute', left: 0 },
  sparkle: { position: 'absolute' },
  back: { position: 'absolute', left: mobileLayout.gutter - 8, zIndex: 2 },
  stage: { position: 'absolute', right: 6, bottom: 34, alignItems: 'center' },
  // Bóng mềm sát chân (ảnh Tripi có lề trong suốt nên đặt cao hơn đáy ảnh).
  shadow: {
    position: 'absolute',
    bottom: 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: x.shadow,
  },
  bubble: {
    position: 'absolute',
    maxWidth: 190,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: x.radius.md,
    backgroundColor: x.day.surface,
    shadowColor: x.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.12,
    elevation: 3,
  },
  bubbleText: { fontSize: 13, lineHeight: 18, fontFamily: nativeFonts.semibold, color: x.day.text },
  bubbleTail: {
    position: 'absolute',
    right: 18,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: x.day.surface,
    transform: [{ rotate: '45deg' }],
  },
  copy: { position: 'absolute', left: mobileLayout.gutter, bottom: 46, gap: 6 },
  title: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontFamily: nativeFonts.extraBold,
    color: x.day.text,
  },
  titleCompact: { fontSize: 25, lineHeight: 31 },
  accent: { color: x.day.link },
  body: { fontSize: 14, lineHeight: 20, color: x.day.textSecondary },
});
