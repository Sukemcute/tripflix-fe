import { vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { compactType } from '@/components/mobile-scale';
import { Icon, Txt, type IconName } from '@/components/mobile-ui';
const copy = vi.mobile.tripPlan;
const DAY_DOT = 10;
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
  const accent = tone === 'flight' ? colors.teal : colors.coral;
  const ink = tone === 'flight' ? colors.tealInk : colors.coralInk;
  return (
    <View
      style={[
        styles.card,
        { borderColor: accent, backgroundColor: tone === 'flight' ? colors.seaMist : colors.warmMist },
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
              color={isDisabled ? colors.textSubtle : ink}
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
            <Icon name={icon} size={18} color={colors.background} />
          </View>
          <View style={styles.cardBody}>
            <Txt style={[styles.otaBadge, { color: ink }]}>{copy.otaBadge}</Txt>
            <Txt style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Txt>
            {!!detail && (
              <Txt style={styles.cardDetail} numberOfLines={3}>
                {detail}
              </Txt>
            )}
            {onExpand && <Txt style={[styles.cardDetail, { color: ink }]}>{copy.viewAndChange}</Txt>}
          </View>
          {onExpand && <Icon name="chevron-forward" size={16} color={ink} />}
          <View style={styles.cardPrice}>
            {price ? <Txt style={[styles.price, { color: ink }]}>{price}</Txt> : null}
            {!!status && <Txt style={styles.cardStatus}>{status}</Txt>}
          </View>
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
  passengers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  passenger: { gap: spacing.xs },
  muted: { ...compactType.meta, color: colors.textMuted },
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
    backgroundColor: colors.background,
    borderRadius: mobileLayout.inputRadius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...compactType.label, fontFamily: nativeFonts.semibold },
  status: { ...compactType.meta, color: colors.coralInk },
  timeline: { gap: 0 },
  day: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg },
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
  dayLabel: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  card: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.sm },
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
    ...compactType.meta,
    fontFamily: nativeFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  cardDetail: { ...compactType.meta, color: colors.textMuted },
  cardPrice: { alignItems: 'flex-end', maxWidth: 110 },
  price: { ...compactType.heading, fontFamily: nativeFonts.semibold },
  cardStatus: { ...compactType.meta, color: colors.danger, textAlign: 'right' },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  cardActionText: { ...compactType.label, fontFamily: nativeFonts.semibold },
  chooser: { gap: spacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  choiceSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceText: { ...compactType.label, color: colors.ink },
  choiceTextSelected: { color: colors.background, fontFamily: nativeFonts.semibold },
  community: { gap: spacing.xs, paddingTop: 2 },
  communityLabel: {
    ...compactType.meta,
    fontFamily: nativeFonts.semibold,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  stopText: { flex: 1, gap: 1 },
  description: { ...compactType.body, color: colors.ink },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  total: { ...compactType.title, fontFamily: nativeFonts.semibold, color: colors.coralInk },
  actions: { gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
