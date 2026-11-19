import { useState } from 'react';
import type { CheckoutDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDate, Icon, money, Row, Txt } from '@/components/mobile-ui';

const text = vi.commerce;

/** Read held-order values; never replace them with a fresh catalogue quote. */
export function CheckoutSummary({ order, total }: { order: CheckoutDto; total?: number }) {
  const [isExpanded, setExpanded] = useState(false);
  const hasRooms = order.items.some((item) => item.productType === 'room');
  return (
    <View style={styles.panel}>
      <View style={styles.group}>
        <Txt accessibilityRole="header" style={styles.title}>
          {text.checkoutSummaryTitle}
        </Txt>
        <Txt style={styles.secondary}>
          {t('commerce.checkoutSummaryCount', {
            services: order.items.length,
            guests: order.adults + order.children + order.infants,
          })}
        </Txt>
      </View>
      {order.items.map((item) => {
        const isFlight = item.productType === 'flight';
        const title = isFlight
          ? item.fromAirport && item.toAirport
            ? `${item.fromAirport} → ${item.toAirport}`
            : item.productName
          : item.propertyName || text.checkoutPropertyUnknown;
        const policy =
          item.isRefundable && item.freeCancelUntil
            ? `${text.freeCancel}: ${formatDate(item.freeCancelUntil.slice(0, 10))}`
            : item.isRefundable
              ? text.refundable
              : text.nonRefundable;
        return (
          <View key={item.id} style={styles.service}>
            <Row style={styles.identity}>
              <Icon name={isFlight ? 'airplane-outline' : 'bed-outline'} size={20} color={colors.textMuted} />
              <Txt style={styles.serviceTitle}>{title}</Txt>
            </Row>
            {!isFlight && <Txt style={styles.body}>{item.productName}</Txt>}
            <Txt style={styles.secondary}>
              {isFlight ? formatDate(item.date) : `${formatDate(item.date)} → ${formatDate(item.dateTo)}`}
            </Txt>
            <Txt style={styles.secondary}>
              {isFlight
                ? t('commerce.checkoutFlightQuantity', { count: item.qty })
                : t('commerce.checkoutRoomQuantity', { count: item.qty, nights: item.nights })}
            </Txt>
            {isExpanded && (
              <View style={styles.details}>
                {isFlight && title !== item.productName && <Txt style={styles.body}>{item.productName}</Txt>}
                <Txt style={styles.body}>{item.ratePlanName}</Txt>
                <Txt style={styles.secondary}>{policy}</Txt>
                <Txt style={styles.linePrice}>{money(item.lineTotal)}</Txt>
              </View>
            )}
          </View>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Txt style={styles.toggleLabel}>
          {isExpanded ? text.checkoutCollapseSummary : text.checkoutExpandSummary}
        </Txt>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.tealInk} />
      </Pressable>
      {hasRooms && (
        <View style={styles.details}>
          <Txt style={styles.body}>{text.checkoutPropertyFees}</Txt>
          <Txt style={styles.secondary}>{text.checkoutPropertyFeesUnknown}</Txt>
        </View>
      )}
      {total !== undefined && (
        <View style={styles.group}>
          <Txt style={styles.secondary}>{text.total}</Txt>
          <Txt style={styles.linePrice}>{money(total)}</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  group: { gap: spacing.sm },
  title: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: colors.navy },
  service: { gap: spacing.sm },
  identity: { alignItems: 'flex-start', gap: spacing.sm },
  serviceTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 25,
    fontFamily: nativeFonts.semibold,
    color: colors.navy,
  },
  body: { fontSize: 14, lineHeight: 23, color: colors.navy },
  secondary: { fontSize: 13, lineHeight: 22, color: colors.textMuted },
  details: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surface },
  linePrice: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: colors.navy },
  toggle: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 23,
    color: colors.tealInk,
    fontFamily: nativeFonts.semibold,
  },
  pressed: { opacity: 0.75 },
});
