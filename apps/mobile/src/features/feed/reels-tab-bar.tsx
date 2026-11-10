import type { ReelFeedTab } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, spacing } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Txt } from '@/components/mobile-ui';
import { CHROME_FADE } from '@/components/motion';

export type ReelTab = ReelFeedTab | 'following';

const TABS: readonly { id: ReelTab; label: string }[] = [
  { id: 'for_you', label: vi.mobile.feed.forYou },
  { id: 'hot', label: vi.mobile.feed.hot },
  { id: 'following', label: vi.mobile.feed.following },
];

export const REEL_TABS: readonly ReelTab[] = TABS.map((tab) => tab.id);

/** Space content must leave below the safe area so the bar never covers it. */
export const REELS_TAB_BAR_HEIGHT = mobileLayout.touchTarget + spacing.sm;

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
      {TABS.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(tab.id)}
            style={[styles.tab, isSelected && styles.selectedTab]}
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
          </Pressable>
        );
      })}
      <View style={styles.search}>
        <IconButton
          name="search-outline"
          label={vi.api.search}
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  tab: {
    flexShrink: 1,
    minHeight: mobileLayout.touchTarget,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  selectedTab: { borderBottomColor: colors.background },
  // Video frames can be bright, so the labels need their own contrast.
  label: {
    color: colors.background,
    fontSize: 16,
    lineHeight: 24,
    textShadowColor: colors.overlayHeavy,
    textShadowRadius: 4,
  },
  selectedLabel: { fontFamily: nativeFonts.bold },
  idleLabel: { opacity: 0.75 },
  search: { position: 'absolute', right: 0, top: 0 },
});
