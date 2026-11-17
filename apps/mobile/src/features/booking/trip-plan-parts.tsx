import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { vi } from '@tripflix/i18n';
import { type ReactNode, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { compactType } from '@/components/mobile-scale';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';
const DAY_DOT = 10;

export function TripBookingAction({
  children,
  onPress,
  disabled,
}: PropsWithChildren<{ onPress: () => void; disabled: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.bookButton, disabled && styles.bookDisabled, pressed && styles.pressed]}
    >
      <Txt style={[styles.bookLabel, disabled && styles.bookDisabledLabel]}>{children}</Txt>
      <Icon name="arrow-forward" size={20} color={disabled ? colors.textMuted : colors.background} />
    </Pressable>
  );
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
  policy,
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
  policy?: string;
  actionLabel?: string;
  isActionOpen?: boolean;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const ink = colors.tealInk;
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Icon name={icon} size={20} color={colors.textMuted} />
        <Txt style={[styles.cardDetail, styles.cardBody]}>
          {tone === 'flight' ? vi.mobile.tripPlan.flightTitle : vi.mobile.tripPlan.stayTitle}
        </Txt>
        {onToggle && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={title}
            accessibilityState={{ checked: !!isSelected, disabled: !!isDisabled }}
            aria-checked={!!isSelected}
            disabled={isDisabled}
            onPress={onToggle}
            style={styles.selectionToggle}
          >
            <Icon
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isDisabled ? colors.textSubtle : ink}
            />
          </Pressable>
        )}
      </View>
      <Txt style={styles.cardTitle}>{title}</Txt>
      {!!detail && <Txt style={styles.cardDetail}>{detail}</Txt>}
      {!!policy && <Txt style={styles.cardDetail}>{policy}</Txt>}
      {!!price && (
        <View style={styles.cardPrice}>
          <Txt style={styles.cardDetail}>{vi.mobile.tripPlan.serviceTotal}</Txt>
          <Txt style={styles.price}>{price}</Txt>
        </View>
      )}
      {!!status && (
        <Txt accessibilityLiveRegion="polite" style={styles.cardStatus}>
          {status}
        </Txt>
      )}
      {onExpand && (
        <Pressable
          accessibilityRole="button"
          onPress={onExpand}
          style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}
        >
          <Txt style={styles.cardActionText}>{vi.mobile.tripPlan.viewAndChange}</Txt>
          <Icon name="arrow-forward" size={18} color={ink} />
        </Pressable>
      )}
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  heroCover: { width: 72, minHeight: 96, alignSelf: 'stretch', borderRadius: radius.md },
  heroFallback: { backgroundColor: colors.seaMist, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flex: 1, minWidth: 0, gap: spacing.xs },
  changeTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: spacing.xl + spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
  },
  featuredCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poster: { width: 72, height: 96, borderRadius: radius.md },
  selectionToggle: {
    minWidth: mobileLayout.touchTarget,
    minHeight: mobileLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  passenger: { gap: spacing.sm, flexGrow: 1, flexBasis: 100, minWidth: 100 },
  muted: { fontSize: 13, lineHeight: 21, color: colors.textMuted },
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
    backgroundColor: colors.seaMist,
  },
  heroChipText: { ...compactType.label, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  bookPanel: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: mobileLayout.cardRadius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filters: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  date: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: mobileLayout.touchTarget,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: mobileLayout.inputRadius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 14, lineHeight: 22, fontFamily: nativeFonts.semibold },
  status: { ...compactType.meta, color: colors.coralInk },
  timeline: { gap: 0 },
  day: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl },
  rail: {
    position: 'absolute',
    left: DAY_DOT / 2 - 1,
    top: DAY_DOT + 4,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  dayDot: {
    width: DAY_DOT,
    height: DAY_DOT,
    marginTop: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.coralTint,
  },
  dayContent: { flex: 1, minWidth: 0, gap: spacing.sm },
  dayLabel: { fontSize: 16, lineHeight: 25, fontFamily: nativeFonts.semibold, color: colors.navy },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 18, lineHeight: 28, fontFamily: nativeFonts.semibold, color: colors.navy },
  cardDetail: { fontSize: 14, lineHeight: 23, color: colors.textMuted },
  cardPrice: { gap: spacing.xs },
  price: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: colors.navy },
  cardStatus: { fontSize: 14, lineHeight: 23, color: colors.coralInk },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  cardActionText: {
    fontSize: 14,
    lineHeight: 23,
    fontFamily: nativeFonts.semibold,
    color: colors.tealInk,
    flexShrink: 1,
  },
  chooser: { gap: spacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: mobileLayout.touchTarget,
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  choiceSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceText: { fontSize: 14, lineHeight: 22, color: colors.ink },
  choiceTextSelected: { color: colors.background, fontFamily: nativeFonts.semibold },
  community: { gap: spacing.xs, paddingTop: 2 },
  communityLabel: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: nativeFonts.semibold,
    color: colors.textMuted,
  },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  stopText: { flex: 1, gap: 1 },
  description: { ...compactType.body, color: colors.ink },
  totalRow: { gap: spacing.md },
  total: { fontSize: 24, lineHeight: 34, fontFamily: nativeFonts.semibold, color: colors.navy },
  bookButton: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.coralInk,
  },
  bookLabel: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: nativeFonts.semibold,
    color: colors.background,
    flexShrink: 1,
    textAlign: 'center',
  },
  bookDisabled: { backgroundColor: colors.surfaceMuted },
  bookDisabledLabel: { color: colors.textMuted },
  actions: { gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
