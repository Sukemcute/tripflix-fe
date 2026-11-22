import { colors } from '@tripflix/tokens';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon } from '@/components/mobile-ui';
import { HEART_POP_SETTLE, HEART_POP_UP } from '@/components/motion';

const HEART_SIZE = 96;
const HOLD_MS = 350;
const RISE = -60;
const LEAVE = { duration: 400, reduceMotion: ReduceMotion.System } as const;

export type HeartBurstItem = { id: number; x: number; y: number; tilt: number };

/** Tim to bật ra đúng chỗ ngón tay nhấn đúp, nảy nhẹ rồi bay lên và mờ đi. */
export function ReelHeartBurst({ burst, onDone }: { burst: HeartBurstItem; onDone: (id: number) => void }) {
  const scale = useSharedValue(0);
  const lift = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.set(withSequence(withTiming(1.2, HEART_POP_UP), withSpring(1, HEART_POP_SETTLE)));
    lift.set(withDelay(HOLD_MS, withTiming(RISE, LEAVE)));
    opacity.set(
      withDelay(
        HOLD_MS,
        withTiming(0, LEAVE, (finished) => {
          if (finished) scheduleOnRN(onDone, burst.id);
        }),
      ),
    );
  }, [burst.id, lift, onDone, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: lift.get() }, { rotate: `${burst.tilt}deg` }, { scale: scale.get() }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.heart, { left: burst.x - HEART_SIZE / 2, top: burst.y - HEART_SIZE / 2 }, style]}
    >
      <Icon name="heart" size={HEART_SIZE} color={colors.coral} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    width: HEART_SIZE,
    height: HEART_SIZE,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
