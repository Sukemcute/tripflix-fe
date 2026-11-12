import type { ReelFeedTab } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, spacing } from '@tripflix/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Txt } from '@/components/mobile-ui';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { CHROME_FADE } from '@/components/motion';

export type ReelTab = ReelFeedTab | 'following';

const TABS: readonly { id: ReelTab; label: string }[] = [
  { id: 'for_you', label: vi.mobile.feed.forYou },
  { id: 'hot', label: vi.mobile.feed.hot },
  { id: 'following', label: vi.mobile.feed.following },
];

export const REEL_TABS: readonly ReelTab[] = TABS.map((tab) => tab.id);

// Compact like TikTok's top tabs; hitSlop keeps the tap area at the 44pt touch target.
const TAB_HEIGHT = 32;
const TAB_HIT_SLOP = (mobileLayout.touchTarget - TAB_HEIGHT) / 2;
const INDICATOR_WIDTH = 20;

/** Space content must leave below the safe area so the bar never covers it. */
export const REELS_TAB_BAR_HEIGHT = TAB_HEIGHT + spacing.sm;

/** Lives above the slides so it stays reachable on tabs that have no video to show. */
export function ReelsTabBar({
  selected,
  isHidden,
  onSelect,
  onSearch,
}: {
  selected: ReelTab;
  isHidden: boolean;
  onSelect: (tab: ReelTab) => void;
  onSearch: () => void;
}) {
  const insets = useSafeAreaInsets();
  const fadeStyle = useAnimatedStyle(() => ({ opacity: withTiming(isHidden ? 0 : 1, CHROME_FADE) }));
  return (
    <Animated.View
      accessibilityRole="tablist"
      style={[styles.bar, { top: insets.top + spacing.sm }, fadeStyle]}
      pointerEvents={isHidden ? 'none' : 'box-none'}
      accessibilityElementsHidden={isHidden}
      importantForAccessibility={isHidden ? 'no-hide-descendants' : 'auto'}
    >
      <LinearGradient
        colors={[colors.overlay, colors.transparent]}
        pointerEvents="none"
        style={[styles.scrim, { top: -insets.top - spacing.sm }]}
      />
      {TABS.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(tab.id)}
            hitSlop={{ top: TAB_HIT_SLOP, bottom: TAB_HIT_SLOP, left: spacing.sm, right: spacing.sm }}
            style={styles.tab}
          >
            <Txt
              variant="label"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.label, isSelected ? styles.selectedLabel : styles.idleLabel]}
            >
              {tab.label}
            </Txt>
            <View style={[styles.indicator, !isSelected && styles.hiddenIndicator]} />
          </Pressable>
        );
      })}
      <View style={styles.search}>
        <IconButton
          name="search-outline"
          label={vi.api.search}
          size={mobileIconSize.nav}
          color={colors.background}
          onPress={onSearch}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    paddingRight: mobileLayout.touchTarget,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scrim: { position: 'absolute', left: -spacing.lg, right: -spacing.lg, bottom: -spacing.lg },
  tab: {
    flexShrink: 1,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: INDICATOR_WIDTH,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.background,
  },
  hiddenIndicator: { opacity: 0 },
  // Video frames can be bright, so the labels need their own contrast.
  label: {
    color: colors.background,
    ...compactType.body,
    textShadowColor: colors.overlayHeavy,
    textShadowRadius: 4,
  },
  selectedLabel: { fontFamily: nativeFonts.bold },
  idleLabel: { opacity: 0.75 },
  // The search button keeps its 44pt size, centred on the shorter bar.
  search: { position: 'absolute', right: 0, top: -TAB_HIT_SLOP },
});
