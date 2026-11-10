import { vi } from '@tripflix/i18n';
import { colors, mobileLayout } from '@tripflix/tokens';
import { usePathname, useSegments } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Mascot } from '@/components/mobile-ui';
import { AssistantDialog } from './assistant-chat';
import { useAssistant } from './assistant-provider';

const SIZE = 64;
const MARGIN = 12;

export function AssistantBubble() {
  const chat = useAssistant();
  const path = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const width = Math.min(dimensions.width, mobileLayout.contentWidth);
  const maxX = Math.max(MARGIN, width - SIZE - MARGIN);
  const minY = insets.top + MARGIN;
  const maxY = Math.max(minY, dimensions.height - insets.bottom - 104 - SIZE);
  const x = useSharedValue(maxX);
  const y = useSharedValue(maxY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const hasDragged = useSharedValue(false);
  const bubble = useRef<ComponentRef<typeof View>>(null);
  function openChat() {
    cancelAnimation(x);
    cancelAnimation(y);
    bubble.current?.measureInWindow((left, top, width, height) => {
      if (width > 0 && height > 0) chat.openFromBubble({ x: left, y: top, width, height });
    });
  }
  useEffect(() => {
    x.set((value) => (value < width / 2 ? MARGIN : maxX));
    y.set((value) => Math.max(minY, Math.min(maxY, value)));
  }, [width, maxX, minY, maxY, x, y]);
  const gesture = usePanGesture({
    minDistance: 8,
    onTouchesDown: () => hasDragged.set(false),
    onActivate: () => {
      cancelAnimation(x);
      cancelAnimation(y);
      startX.set(x.get());
      startY.set(y.get());
      isDragging.set(true);
      hasDragged.set(true);
    },
    onUpdate: (event) => {
      x.set(Math.max(MARGIN, Math.min(maxX, startX.get() + event.translationX)));
      y.set(Math.max(minY, Math.min(maxY, startY.get() + event.translationY)));
    },
    onDeactivate: (event) => {
      x.set(
        withSpring(x.get() + event.velocityX * 0.1 < width / 2 ? MARGIN : maxX, {
          duration: 400,
          dampingRatio: 0.8,
          velocity: event.velocityX,
          overshootClamping: true,
          reduceMotion: ReduceMotion.System,
        }),
      );
      isDragging.set(false);
    },
  });
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: isDragging.get() ? 1.06 : 1 }],
  }));
  const isHidden =
    (path === '/' && segments[0] !== '(tabs)') ||
    path === '/assistant' ||
    /\/(onboarding|login|register|forgot-password|checkout|payments|create|compose)(\/|$)/.test(path);
  if (isHidden) return null;
  return (
    <>
      {!chat.isOpen && (
        <GestureHandlerRootView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="box-none" style={styles.bounds}>
            <GestureDetector gesture={gesture}>
              <Animated.View ref={bubble} collapsable={false} style={[styles.bubble, position]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={vi.assistant.open}
                  accessibilityHint={vi.assistant.drag}
                  accessibilityActions={[
                    { name: 'moveLeft', label: vi.assistant.left },
                    { name: 'moveRight', label: vi.assistant.right },
                  ]}
                  onAccessibilityAction={(event) =>
                    x.set(event.nativeEvent.actionName === 'moveLeft' ? MARGIN : maxX)
                  }
                  onPress={() => {
                    if (!hasDragged.get()) openChat();
                  }}
                  onAccessibilityTap={openChat}
                  style={styles.touch}
                >
                  <View pointerEvents="none">
                    <Mascot size={58} />
                  </View>
                  <View style={styles.badge}>
                    <Icon name="sparkles" size={12} color={colors.background} />
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureHandlerRootView>
      )}
      <AssistantDialog />
    </>
  );
}

const styles = StyleSheet.create({
  bounds: { flex: 1, width: '100%', maxWidth: mobileLayout.contentWidth, alignSelf: 'center' },
  bubble: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.warmMist,
    borderWidth: 2,
    borderColor: colors.background,
    boxShadow: `0 4px 16px ${colors.overlay}`,
  },
  touch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
});
