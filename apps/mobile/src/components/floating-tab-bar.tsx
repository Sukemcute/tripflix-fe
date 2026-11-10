import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, nativeFonts, spacing } from '@tripflix/tokens';
import { LinearGradient } from 'expo-linear-gradient';
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
const BAR_HEIGHT = 64;
const COMPOSE_SIZE = 44;
const COMPOSE_RADIUS = 13;
// The design's 24-unit SVG shown at 28px: a 14-unit line with 3.6-unit stroke and round caps.
const PLUS_SCALE = 28 / 24;
const PLUS_THICKNESS = 3.6 * PLUS_SCALE;
const PLUS_LENGTH = (14 + 3.6) * PLUS_SCALE;

/** Stays in the layout flow, so screen content (video included) ends at the bar's top edge. */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((route) => route.name in ICONS);
  const activeRoute = state.routes[state.index];

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {routes.map((route) => {
        const options = descriptors[route.key]!.options;
        const isFocused = route.key === activeRoute?.key;
        const isCompose = route.name === 'compose';
        const label = options.title ?? route.name;
        const tint = isFocused ? colors.coralSoft : colors.background;
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
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            {isCompose ? (
              <ComposeIcon />
            ) : (
              <>
                <Ionicons name={ICONS[route.name]!} size={26} color={tint} />
                <Text
                  aria-hidden
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  style={[styles.label, { color: tint }]}
                >
                  {label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Drawn from views to match the design's SVG plus without adding react-native-svg. */
function ComposeIcon() {
  return (
    <View style={styles.compose}>
      <LinearGradient
        colors={[colors.composeStart, colors.coral, colors.composeEnd]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.composeFill}
      />
      {/* Shadows sit in their own layer so one bar's shadow never darkens the other bar. */}
      <View style={[styles.plusBar, styles.plusShadow, styles.plusHorizontal]} />
      <View style={[styles.plusBar, styles.plusShadow, styles.plusVertical]} />
      <View style={[styles.plusBar, styles.plusHorizontal]} />
      <View style={[styles.plusBar, styles.plusVertical]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    backgroundColor: colors.tabBar,
  },
  tab: { flex: 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  pressed: { opacity: 0.65 },
  compose: {
    width: COMPOSE_SIZE,
    height: COMPOSE_SIZE,
    borderRadius: COMPOSE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -4 }],
  },
  composeFill: { ...StyleSheet.absoluteFill, borderRadius: COMPOSE_RADIUS },
  plusBar: {
    position: 'absolute',
    borderRadius: PLUS_THICKNESS / 2,
    backgroundColor: colors.background,
  },
  plusShadow: { boxShadow: [{ offsetX: 0, offsetY: 1.5, blurRadius: 2, color: colors.composeIconShadow }] },
  plusHorizontal: { width: PLUS_LENGTH, height: PLUS_THICKNESS },
  plusVertical: { width: PLUS_THICKNESS, height: PLUS_LENGTH },
  label: { fontFamily: nativeFonts.semibold, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
