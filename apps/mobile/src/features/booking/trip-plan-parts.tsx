import { t } from '@tripflix/i18n';
import { explorer as x, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { typeStyle } from '@/components/type-scale';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';
import { listPassengerGroups, type PassengerCounts } from './passenger-groups';
const DAY_DOT = 28;

/** "2 người lớn · 1 trẻ em": chỉ nhóm có người, ngắn hơn bản luôn in đủ ba nhóm. */
export function formatPassengerSummary(counts: PassengerCounts): string {
  const labels = {
    adults: 'mobile.tripPlan.passengerAdults',
    children: 'mobile.tripPlan.passengerChildren',
    infants: 'mobile.tripPlan.passengerInfants',
  } as const;
  return listPassengerGroups(counts)
    .map((group) => t(labels[group.kind], { count: group.count }))
    .join(' · ');
}
export function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

/** Thẻ dịch vụ Tripflix bán được (vé bay, chỗ ở): nổi bật hơn gợi ý cộng đồng, dùng chung cho màn xem và màn đặt. */
export function ProductCard({
  tone,
  icon,
  title,
  detail,
  price,
  status,
  actionLabel,
  isActionOpen,
  onAction,
  children,
  isSelected,
  isDisabled,
  onToggle,
  onExpand,
  offers,
}: {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggle?: () => void;
  onExpand?: () => void;
  offers?: ReactNode;
  tone: 'flight' | 'hotel';
  icon: IconName;
  title: string;
  detail?: string;
  price?: string;
  status?: string;
  actionLabel?: string;
  isActionOpen?: boolean;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const accent = tone === 'flight' ? x.brand.teal : x.brand.coral;
  const ink = x.brand.ink;
  return (
    <View
      style={[
        styles.cardSurface,
        styles.card,
        isSelected && !isDisabled && { borderStartColor: tone === 'flight' ? x.day.link : x.day.price },
      ]}
    >
      <View style={styles.cardRow}>
        {onToggle && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={title}
            accessibilityState={{ checked: !!isSelected, disabled: !!isDisabled }}
            disabled={isDisabled}
            onPress={onToggle}
            style={styles.selectionToggle}
          >
            <Icon
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isDisabled ? x.day.textSecondary : ink}
            />
          </Pressable>
        )}
        <Pressable
          accessibilityRole={onExpand ? 'button' : undefined}
          accessibilityLabel={title}
          disabled={!onExpand}
          onPress={onExpand}
          style={[styles.cardRow, styles.cardBody]}
        >
          <View style={[styles.cardIcon, { backgroundColor: accent }]}>
            <Icon name={icon} size={18} color={x.action.onPrimary} />
          </View>
          <View style={styles.cardBody}>
            <Txt style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Txt>
            {!!detail && (
              <Txt style={styles.cardDetail} numberOfLines={2}>
                {detail}
              </Txt>
            )}
            {/* Giá nằm dưới tên, không chen ngang hàng: tên khách sạn, chuyến bay có trọn bề ngang để đọc hết. */}
            {(!!price || !!status) && (
              <View style={styles.cardPriceRow}>
                {price ? <Txt style={[styles.price, { color: x.day.price }]}>{price}</Txt> : null}
                {!!status && <Txt style={styles.cardStatus}>{status}</Txt>}
              </View>
            )}
          </View>
          {onExpand && <Icon name="chevron-forward" size={16} color={ink} />}
        </Pressable>
      </View>
      {!!actionLabel && onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={isActionOpen === undefined ? undefined : { expanded: isActionOpen }}
          onPress={onAction}
          style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}
        >
          <Icon name="swap-horizontal" size={14} color={ink} />
          <Txt style={[styles.cardActionText, { color: ink }]}>{actionLabel}</Txt>
          <Icon
            name={
              isActionOpen === undefined ? 'chevron-forward' : isActionOpen ? 'chevron-up' : 'chevron-down'
            }
            size={14}
            color={ink}
          />
        </Pressable>
      )}
      {offers}
      {isActionOpen && children}
    </View>
  );
}

export function ChoiceChip({
  label,
  isSelected,
  onPress,
  isDisabled = false,
}: {
  isDisabled?: boolean;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      onPress={onPress}
      style={[styles.choice, isSelected && styles.choiceSelected]}
    >
      <Txt style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>{label}</Txt>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  tripHero: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  heroCover: { width: 72, minHeight: 96, alignSelf: 'stretch', borderRadius: radius.md },
  heroFallback: { backgroundColor: x.day.tintExplore, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flex: 1, minWidth: 0, gap: spacing.xs },
  changeTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: spacing.xl + spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  featuredCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: x.day.surface,
    borderWidth: 1,
    borderColor: x.day.line,
  },
  poster: { width: 72, height: 96, borderRadius: radius.md },
  selectionToggle: {
    minWidth: mobileLayout.touchTarget,
    minHeight: mobileLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  passenger: { gap: spacing.xs },
  muted: { ...typeStyle('micro'), color: x.day.textSecondary },
  pressed: { opacity: 0.7 },
  hero: { gap: spacing.xs, marginBottom: spacing.md },
  heroChips: { gap: spacing.xs, flexWrap: 'wrap' },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  heroChipText: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold, color: x.day.link },
  bookPanel: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: mobileLayout.cardRadius,
    backgroundColor: x.day.canvas,
    borderWidth: 1,
    borderColor: x.day.line,
  },
  filters: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  date: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: mobileLayout.touchTarget,
    backgroundColor: x.day.surface,
    borderRadius: mobileLayout.inputRadius,
    borderWidth: 1,
    borderColor: x.day.line,
  },
  label: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold },
  status: { ...typeStyle('micro'), color: x.day.error },
  timeline: { gap: 0 },
  day: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg },
  rail: {
    position: 'absolute',
    left: DAY_DOT / 2 - 1,
    top: DAY_DOT + 2,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: x.day.line,
  },
  // Mốc ngày dạng huy hiệu có số, như đường thời gian trong thiết kế Stitch.
  dayDot: {
    width: DAY_DOT,
    height: DAY_DOT,
    borderRadius: radius.pill,
    backgroundColor: x.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: { color: x.action.onPrimary, fontFamily: nativeFonts.bold, fontSize: 14, lineHeight: 18 },
  dayContent: { flex: 1, minWidth: 0, gap: spacing.sm },
  dayLabel: { ...typeStyle('subhead'), fontFamily: nativeFonts.semibold, color: x.day.text },
  cardSurface: {
    borderWidth: 1,
    borderColor: x.day.line,
    borderRadius: radius.lg,
    backgroundColor: x.day.surface,
    boxShadow: `0 5px 14px -7px ${x.backdrop}`,
  },
  card: {
    borderStartWidth: 3,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  otaBadge: {
    ...typeStyle('micro'),
    fontFamily: nativeFonts.semibold,
  },
  cardTitle: { ...typeStyle('bodyStrong'), fontFamily: nativeFonts.semibold, color: x.day.text },
  cardDetail: { ...typeStyle('caption'), color: x.day.textSecondary },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm },
  price: { ...typeStyle('bodyStrong'), fontFamily: nativeFonts.semibold },
  cardStatus: { ...typeStyle('micro'), color: x.day.error },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: x.day.tintExplore,
  },
  cardActionText: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold },
  chooser: { gap: spacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  choiceSelected: { backgroundColor: x.day.link, borderColor: x.day.link },
  choiceText: { ...typeStyle('caption'), color: x.day.text },
  choiceTextSelected: { color: x.brand.white, fontFamily: nativeFonts.semibold },
  community: { gap: spacing.xs, paddingTop: 2 },
  communityLabel: {
    ...typeStyle('micro'),
    fontFamily: nativeFonts.semibold,
    color: x.day.textSecondary,
  },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  stopText: { flex: 1, gap: 1 },
  description: { ...typeStyle('label'), color: x.day.text },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  total: { ...typeStyle('subhead'), fontFamily: nativeFonts.extraBold, color: x.day.price },
  actions: { gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
