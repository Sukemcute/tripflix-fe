import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, nativeFonts, spacing } from '@tripflix/tokens';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<string, IconName> = {
  index: 'play-circle-outline',
  explore: 'compass-outline',
  compose: 'add',
  trips: 'bag-handle-outline',
  me: 'person-outline',
};
const COMPOSE_SIZE = 66;
const DOCK_HEIGHT = 80;

export function getFloatingTabBarHeight(bottomInset: number) {
  return spacing.xs + DOCK_HEIGHT + Math.max(bottomInset, spacing.md);
}

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((route) => route.name in ICONS);
  const activeRoute = state.routes[state.index];
  const overlaysVideo = activeRoute?.name === 'index';

  return (
    <View
      pointerEvents={overlaysVideo ? 'box-none' : 'auto'}
      style={[
        styles.container,
        overlaysVideo && styles.videoContainer,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md),
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg),
        },
      ]}
    >
      <View accessibilityRole="tablist" pointerEvents="box-none" style={styles.dock}>
        <View pointerEvents="none" style={[styles.surface, overlaysVideo && styles.videoSurface]} />
        {routes.map((route) => {
          const options = descriptors[route.key]!.options;
          const isFocused = route.key === activeRoute?.key;
          const isCompose = route.name === 'compose';
          const label = options.title ?? route.name;
          const tint = overlaysVideo
            ? isFocused
              ? colors.coralSoft
              : colors.background
            : isFocused
              ? colors.coralInk
              : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole={isCompose ? 'button' : 'tab'}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={isCompose ? undefined : { selected: isFocused }}
              aria-selected={isCompose ? undefined : isFocused}
              testID={`tab-${route.name}`}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={[styles.tab, isCompose && styles.composeTab]}
            >
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      isCompose ? styles.composeHighlight : styles.tabContent,
                      isCompose && overlaysVideo && styles.videoComposeHighlight,
                      { opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    {isCompose ? (
                      <View style={styles.disc}>
                        <Ionicons name="add" size={30} color={colors.background} />
                      </View>
                    ) : (
                      <View style={styles.icon}>
                        <Ionicons name={ICONS[route.name]!} size={24} color={tint} />
                      </View>
                    )}
                  </View>
                  <Text
                    aria-hidden
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                    style={[styles.label, { color: tint, opacity: pressed ? 0.65 : 1 }]}
                  >
                    {label}
                  </Text>
                </>
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
  videoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
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
  videoSurface: { backgroundColor: colors.overlayHeavy },
  composeTab: { justifyContent: 'flex-start', alignItems: 'center' },
  composeHighlight: {
    width: COMPOSE_SIZE,
    height: COMPOSE_SIZE,
    borderRadius: COMPOSE_SIZE / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoComposeHighlight: { backgroundColor: 'transparent' },
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
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    fontFamily: nativeFonts.medium,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
});
