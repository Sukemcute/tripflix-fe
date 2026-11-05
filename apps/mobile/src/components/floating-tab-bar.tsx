import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing } from '@tripflix/tokens';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type IconName = ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<string, { outline: IconName; filled: IconName }> = {
  index: { outline: 'play-circle-outline', filled: 'play-circle' },
  explore: { outline: 'compass-outline', filled: 'compass' },
  compose: { outline: 'add', filled: 'add' },
  trips: { outline: 'bag-handle-outline', filled: 'bag-handle' },
  me: { outline: 'person-outline', filled: 'person' },
};
const ORBIT_SIZE = 66;
const DOCK_HEIGHT = 80;

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [width, setWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const routes = state.routes.filter((route) => route.name in ICONS);
  const activeRoute = state.routes[state.index];
  const activeIndex = routes.findIndex((route) => route.key === activeRoute?.key);
  const position = useSharedValue(Math.max(activeIndex, 0));
  const itemWidth = width / routes.length;

  useEffect(() => {
    position.set(
      withSpring(Math.max(activeIndex, 0), {
        duration: 400,
        dampingRatio: 1,
        overshootClamping: true,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [activeIndex, position]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (position.get() + 0.5) * itemWidth - ORBIT_SIZE / 2 }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md),
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg),
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        style={styles.dock}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <View pointerEvents="none" style={styles.surface} />
        {width > 0 && activeIndex >= 0 && (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.orbit, orbitStyle]}
          >
            <View style={styles.disc}>
              <Ionicons name={ICONS[activeRoute!.name]!.filled} size={27} color={colors.background} />
            </View>
          </Animated.View>
        )}
        {routes.map((route) => {
          const options = descriptors[route.key]!.options;
          const isFocused = route.key === activeRoute?.key;
          const label = options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: isFocused }}
              aria-selected={isFocused}
              testID={`tab-${route.name}`}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.tab}
            >
              {({ pressed }) => (
                <Animated.View
                  style={[
                    styles.tabContent,
                    {
                      opacity: pressed ? 0.65 : 1,
                      transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
                      transitionProperty: ['opacity', 'transform'],
                      transitionDuration: reducedMotion ? 0 : 120,
                    },
                  ]}
                >
                  <View style={[styles.icon, { opacity: isFocused ? 0 : 1 }]}>
                    <Ionicons name={ICONS[route.name]!.outline} size={24} color={colors.textMuted} />
                  </View>
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, paddingTop: spacing.xs },
  dock: { height: DOCK_HEIGHT, flexDirection: 'row' },
  surface: {
    position: 'absolute',
    top: 22,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 18,
    backgroundColor: colors.coralTint,
  },
  orbit: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: ORBIT_SIZE / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: { flex: 1, minHeight: 48, justifyContent: 'flex-end', borderRadius: 18 },
  tabContent: { alignItems: 'center', paddingBottom: spacing.lg },
  icon: { height: 28, alignItems: 'center', justifyContent: 'center' },
});
