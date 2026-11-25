import type { ExploreUnderstoodDto } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Icon, money, Txt, type IconName } from '@/components/mobile-ui';

const copy = vi.mobile.searchFilters;
const REMOVE_HIT_SLOP = { top: 10, bottom: 10, left: 6, right: 10 };

type UnderstoodChip = { key: string; icon: IconName; label: string; onRemove?: () => void };

/**
 * Hệ thống hiểu câu tìm thế nào, đặt ngay dưới ô tìm: mỗi điều kiện một chip có icon riêng, điều kiện nới được
 * (ngân sách, số ngày) có nút × để bỏ ngay mà không phải gõ lại.
 */
export function UnderstoodBar({
  understood,
  onRemoveBudget,
  onRemoveDays,
}: {
  understood: ExploreUnderstoodDto;
  onRemoveBudget: () => void;
  onRemoveDays: () => void;
}) {
  const chips: UnderstoodChip[] = [];
  if (understood.place) chips.push({ key: 'place', icon: 'location', label: understood.place });
  if (understood.budget)
    chips.push({
      key: 'budget',
      icon: 'wallet-outline',
      label: t('mobile.searchFilters.understoodBudget', { price: money(understood.budget) }),
      onRemove: onRemoveBudget,
    });
  if (understood.days)
    chips.push({
      key: 'days',
      icon: 'calendar-outline',
      label: t('mobile.searchFilters.understoodDays', { count: understood.days }),
      onRemove: onRemoveDays,
    });
  for (const [from, to] of Object.entries(understood.fixed ?? {}))
    chips.push({
      key: `fixed-${from}`,
      icon: 'color-wand-outline',
      label: t('mobile.searchFilters.understoodFixed', { from, to }),
    });
  for (const name of understood.names ?? [])
    chips.push({ key: `name-${name}`, icon: 'pricetag-outline', label: name });
  if (!chips.length) return null;

  return (
    <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)} style={styles.bar}>
      <View style={styles.lead}>
        <Icon name="sparkles" size={14} color={x.day.link} />
        <Txt style={styles.leadText}>{copy.understoodLabel}</Txt>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((chip) => (
          <View key={chip.key} style={styles.chip}>
            <Icon name={chip.icon} size={14} color={x.day.link} />
            <Txt style={styles.chipText} numberOfLines={1}>
              {chip.label}
            </Txt>
            {chip.onRemove && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('mobile.searchFilters.understoodRemove', { label: chip.label })}
                hitSlop={REMOVE_HIT_SLOP}
                onPress={chip.onRemove}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              >
                <Icon name="close" size={12} color={x.day.link} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xs },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leadText: { fontFamily: nativeFonts.semibold, fontSize: 13, lineHeight: 18, color: x.day.textSecondary },
  chips: { gap: spacing.xs, paddingRight: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: x.day.link,
    backgroundColor: x.day.surface,
  },
  chipText: {
    fontFamily: nativeFonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: x.day.link,
    maxWidth: 200,
  },
  remove: {
    width: 18,
    height: 18,
    marginLeft: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintExplore,
  },
  pressed: { opacity: 0.6 },
});
