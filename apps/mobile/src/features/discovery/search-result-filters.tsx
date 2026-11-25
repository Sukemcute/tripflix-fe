import type { SearchPostsRequestDtoPostType } from '@tripflix/api-client';
import type { SearchPostsRequestDtoSort } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BottomSheet } from '@/components/bottom-sheet';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';

const copy = vi.mobile.searchFilters;
const INDICATOR_SPRING = { damping: 20, stiffness: 220, reduceMotion: ReduceMotion.System } as const;

const TYPES: readonly { value: SearchPostsRequestDtoPostType; label: string; icon: IconName }[] = [
  { value: 'all', label: copy.all, icon: 'apps-outline' },
  { value: 'plan', label: copy.plans, icon: 'map-outline' },
  { value: 'video', label: copy.videos, icon: 'play-circle-outline' },
  { value: 'post', label: copy.posts, icon: 'document-text-outline' },
];

const SORTS: readonly { value: SearchPostsRequestDtoSort; label: string; hint: string; icon: IconName }[] = [
  { value: 'relevance', label: vi.api.postSortRelevance, hint: copy.relevanceHint, icon: 'sparkles-outline' },
  { value: 'trending', label: vi.api.postSortTrending, hint: copy.trendingHint, icon: 'flame-outline' },
  { value: 'recent', label: vi.api.postSortRecent, hint: copy.recentHint, icon: 'time-outline' },
];

/**
 * Lọc loại nội dung là thanh tab gạch chân (chọn một, đổi cả danh sách), còn sắp xếp là một nút nhỏ mở bảng chọn:
 * hai việc khác nhau nên trông khác nhau, không còn hai hàng chip giống hệt.
 */
export function SearchResultFilters({
  postType,
  sort,
  total,
  onPostTypeChange,
  onSortChange,
}: {
  postType: SearchPostsRequestDtoPostType;
  sort: SearchPostsRequestDtoSort;
  total?: number;
  onPostTypeChange: (type: SearchPostsRequestDtoPostType) => void;
  onSortChange: (sort: SearchPostsRequestDtoSort) => void;
}) {
  const [isSortOpen, setSortOpen] = useState(false);
  const currentSort = SORTS.find((option) => option.value === sort) ?? SORTS[0]!;
  return (
    <View style={styles.wrap}>
      <TypeTabs value={postType} onChange={onPostTypeChange} />
      <View style={styles.sortRow}>
        <Txt variant="small" style={styles.count}>
          {total !== undefined ? t('mobile.searchFilters.resultCount', { count: total }) : ''}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${vi.api.postSortAria}: ${currentSort.label}`}
          onPress={() => setSortOpen(true)}
          style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}
        >
          <Icon name="swap-vertical" size={16} color={x.day.link} />
          <Txt variant="small" style={styles.sortLabel}>
            {currentSort.label}
          </Txt>
          <Icon name="chevron-down" size={14} color={x.day.link} />
        </Pressable>
      </View>
      <BottomSheet visible={isSortOpen} title={copy.sortBy} compact onClose={() => setSortOpen(false)}>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {SORTS.map((option) => {
            const isSelected = option.value === sort;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => {
                  setSortOpen(false);
                  if (!isSelected) onSortChange(option.value);
                }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                  <Icon name={option.icon} size={20} color={isSelected ? x.brand.white : x.day.link} />
                </View>
                <View style={styles.optionCopy}>
                  <Txt variant="label">{option.label}</Txt>
                  <Txt variant="small" style={styles.count}>
                    {option.hint}
                  </Txt>
                </View>
                {isSelected && <Icon name="checkmark-circle" size={22} color={x.day.link} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

function TypeTabs({
  value,
  onChange,
}: {
  value: SearchPostsRequestDtoPostType;
  onChange: (type: SearchPostsRequestDtoPostType) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    TYPES.findIndex((type) => type.value === value),
  );
  const tabWidth = width / TYPES.length;
  const offset = useSharedValue(0);
  const isMeasured = useSharedValue(false);
  useEffect(() => {
    if (!tabWidth) return;
    // Lần đo đầu đặt thẳng vào chỗ, các lần đổi tab sau mới trượt.
    offset.set(isMeasured.get() ? withSpring(index * tabWidth, INDICATOR_SPRING) : index * tabWidth);
    isMeasured.set(true);
  }, [index, tabWidth, offset, isMeasured]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={copy.typesLabel}
      style={styles.tabs}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {TYPES.map((type) => (
        <TypeTab
          key={type.value}
          label={type.label}
          icon={type.icon}
          isSelected={type.value === value}
          onPress={() => onChange(type.value)}
        />
      ))}
      {tabWidth > 0 && (
        <Animated.View style={[styles.indicatorTrack, { width: tabWidth }, indicatorStyle]}>
          <View style={styles.indicator} />
        </Animated.View>
      )}
    </View>
  );
}

function TypeTab({
  label,
  icon,
  isSelected,
  onPress,
}: {
  label: string;
  icon: IconName;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const color = isSelected ? x.day.text : x.day.textSecondary;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.92, { duration: 90, reduceMotion: ReduceMotion.System }))}
      onPressOut={() => scale.set(withSpring(1, INDICATOR_SPRING))}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabInner, pressStyle]}>
        <Icon name={isSelected ? (icon.replace('-outline', '') as IconName) : icon} size={20} color={color} />
        <Txt style={[styles.tabLabel, { color }, isSelected && styles.tabLabelSelected]} numberOfLines={1}>
          {label}
        </Txt>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: x.day.line },
  tab: { flex: 1, minHeight: 56, justifyContent: 'center' },
  tabInner: { alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  tabLabel: { fontFamily: nativeFonts.medium, fontSize: 13, lineHeight: 18 },
  tabLabelSelected: { fontFamily: nativeFonts.bold },
  indicatorTrack: { position: 'absolute', left: 0, bottom: -1, alignItems: 'center' },
  indicator: { width: 36, height: 3, borderRadius: radius.pill, backgroundColor: x.action.primary },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  count: { color: x.day.textSecondary, flexShrink: 1 },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  sortLabel: { color: x.day.link, fontFamily: nativeFonts.semibold },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
  },
  optionSelected: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintExplore,
  },
  optionIconSelected: { backgroundColor: x.day.link },
  optionCopy: { flex: 1, gap: 2 },
});
