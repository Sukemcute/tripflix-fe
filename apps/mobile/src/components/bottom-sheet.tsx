import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  GestureStateManager,
  useNativeGesture,
  usePanGesture,
  type PanGestureActiveEvent,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { IconButton, Txt, copy } from './mobile-ui';
import { SHEET_CLOSE_SPRING, SHEET_OPEN_SPRING } from './motion';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 800;
const DISMISS_MIN_DISTANCE = 12;

/**
 * A sheet the parent opens and closes through `visible`. Closing animates before the Modal
 * unmounts, whichever way it was requested, so the parent never has to wait for it.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  footer,
  isScrollEnabled = true,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  /** Off when the content has its own drag, which a scrolling parent would otherwise take over. */
  isScrollEnabled?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isMounted, setMounted] = useState(false);
  const translateY = useSharedValue(windowHeight);
  const sheetHeight = useSharedValue(windowHeight);
  const startOffset = useSharedValue(0);
  const releaseVelocity = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      scrollY.set(0);
      translateY.set(withSpring(0, SHEET_OPEN_SPRING));
      return;
    }
    translateY.set(
      // A flick keeps its speed on the way out rather than stalling before the spring starts.
      withSpring(windowHeight, { ...SHEET_CLOSE_SPRING, velocity: releaseVelocity.get() }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      }),
    );
    releaseVelocity.set(0);
  }, [visible, windowHeight, translateY, releaseVelocity, scrollY]);
  const startDrag = (event: PanGestureActiveEvent) => {
    'worklet';
    // Activation happens a few points in; subtracting that keeps the sheet from jumping.
    startOffset.set(translateY.get() - event.translationY);
  };
  const moveDrag = (event: PanGestureActiveEvent) => {
    'worklet';
    translateY.set(Math.max(0, startOffset.get() + event.translationY));
  };
  const settleDrag = (event: PanGestureActiveEvent & { canceled: boolean }) => {
    'worklet';
    const isDismissed =
      !event.canceled &&
      (translateY.get() > DISMISS_DISTANCE ||
        (event.velocityY > DISMISS_VELOCITY && translateY.get() > DISMISS_MIN_DISTANCE));
    if (isDismissed) {
      releaseVelocity.set(event.velocityY);
      scheduleOnRN(onClose);
    } else {
      translateY.set(withSpring(0, { ...SHEET_CLOSE_SPRING, velocity: event.velocityY }));
    }
  };
  const headerPan = usePanGesture({
    activeOffsetY: DISMISS_MIN_DISTANCE,
    failOffsetX: [-20, 20],
    onActivate: startDrag,
    onUpdate: moveDrag,
    onDeactivate: settleDrag,
  });
  // Nội dung đang ở trên cùng thì vuốt xuống ở đâu cũng kéo sheet; còn lại vẫn cuộn như thường.
  const bodyScroll = useNativeGesture();
  const bodyPan = usePanGesture({
    // Nội dung có cử chỉ kéo riêng (lịch chọn ngày) thì chỉ kéo sheet ở phần đầu.
    enabled: isScrollEnabled,
    manualActivation: true,
    simultaneousWith: bodyScroll,
    onTouchesDown: (event) => {
      const touch = event.allTouches[0];
      if (!touch || scrollY.get() > 1 || event.numberOfTouches !== 1) {
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      touchX.set(touch.absoluteX);
      touchY.set(touch.absoluteY);
    },
    onTouchesMove: (event) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      const dy = touch.absoluteY - touchY.get();
      const dx = Math.abs(touch.absoluteX - touchX.get());
      if (dy < -8 || dx > 20 || event.numberOfTouches !== 1) GestureStateManager.fail(event.handlerTag);
      else if (dy > DISMISS_MIN_DISTANCE && dy > dx && scrollY.get() <= 1)
        GestureStateManager.activate(event.handlerTag);
    },
    onActivate: startDrag,
    onUpdate: moveDrag,
    onDeactivate: settleDrag,
  });
  const onBodyScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, sheetHeight.get()], [1, 0], Extrapolation.CLAMP),
  }));
  if (!visible && !isMounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        {/* Ô nhập trong sheet (ví dụ ghi chú báo cáo) không bị bàn phím che. */}
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Animated.View
            accessibilityViewIsModal
            accessibilityLabel={title}
            onAccessibilityEscape={onClose}
            onLayout={(event) => {
              sheetHeight.set(event.nativeEvent.layout.height);
              setMounted(true);
            }}
            style={[
              styles.sheet,
              { maxHeight: windowHeight * 0.85, paddingBottom: Math.max(insets.bottom, spacing.md) },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={headerPan}>
              <View collapsable={false}>
                <View style={styles.handle} />
                <View style={styles.heading}>
                  <Txt variant="label" numberOfLines={1} style={styles.title}>
                    {title}
                  </Txt>
                  <IconButton name="close" label={copy.common.close} onPress={onClose} />
                </View>
              </View>
            </GestureDetector>
            <GestureDetector gesture={bodyPan}>
              <Animated.View style={styles.body}>
                <GestureDetector gesture={bodyScroll}>
                  <Animated.ScrollView
                    style={styles.body}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.bodyContent}
                    bounces={false}
                    onScroll={onBodyScroll}
                    scrollEventThrottle={16}
                    scrollEnabled={isScrollEnabled}
                  >
                    {children}
                  </Animated.ScrollView>
                </GestureDetector>
              </Animated.View>
            </GestureDetector>
            {!!footer && <View style={styles.footer}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: mobileLayout.contentWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderTopLeftRadius: mobileLayout.sheetRadius,
    borderTopRightRadius: mobileLayout.sheetRadius,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: mobileLayout.gutter,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: { flex: 1 },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: mobileLayout.gutter, paddingBottom: spacing.md },
  footer: {
    paddingHorizontal: mobileLayout.gutter,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
