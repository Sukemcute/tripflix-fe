import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing } from '@tripflix/tokens';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((route) => route.name in ICONS);
  const activeRoute = state.routes[state.index];

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
      <View accessibilityRole="tablist" style={styles.dock}>
        <View pointerEvents="none" style={styles.surface} />
        {routes.map((route) => {
          const options = descriptors[route.key]!.options;
          const isFocused = route.key === activeRoute?.key;
          const isCompose = route.name === 'compose';
          const label = options.title ?? route.name;
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
                <View
                  style={[
                    isCompose ? styles.composeHighlight : styles.tabContent,
                    { opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  {isCompose ? (
                    <View style={styles.disc}>
                      <Ionicons name="add" size={30} color={colors.background} />
                    </View>
                  ) : (
                    <View style={styles.icon}>
                      <Ionicons
                        name={ICONS[route.name]!}
                        size={24}
                        color={isFocused ? colors.coralInk : colors.textMuted}
                      />
                    </View>
                  )}
                </View>
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
  composeTab: { justifyContent: 'flex-start', alignItems: 'center' },
  composeHighlight: {
    width: COMPOSE_SIZE,
    height: COMPOSE_SIZE,
    borderRadius: COMPOSE_SIZE / 2,
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
