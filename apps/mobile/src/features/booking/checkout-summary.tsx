import { useState } from 'react';
import type { CheckoutDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
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
          <View key={item.id} style={[styles.service, isFlight ? styles.flight : styles.stay]}>
            <Row style={styles.identity}>
              <Icon name={isFlight ? 'airplane-outline' : 'bed-outline'} size={20} color={x.day.text} />
              <Txt style={[styles.serviceTitle, isFlight && styles.route]}>{title}</Txt>
            </Row>
            {!isFlight && <Txt style={styles.body}>{item.productName}</Txt>}
            <Row style={styles.metaRow}>
              <Txt style={[styles.secondary, styles.date]}>
                {isFlight ? formatDate(item.date) : `${formatDate(item.date)} → ${formatDate(item.dateTo)}`}
              </Txt>
              <Txt style={styles.secondary}>
                {isFlight
                  ? t('commerce.checkoutFlightQuantity', { count: item.qty })
                  : t('commerce.checkoutRoomQuantity', { count: item.qty, nights: item.nights })}
              </Txt>
            </Row>
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
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={x.brand.white} />
      </Pressable>
      {hasRooms && (
        <View style={styles.fees}>
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
    gap: spacing.md,
  },
  group: { gap: spacing.sm },
  title: { fontSize: 24, lineHeight: 34, fontFamily: nativeFonts.bold, color: x.day.text },
  service: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md },
  flight: { backgroundColor: x.day.tintSun },
  stay: { backgroundColor: x.day.tintExplore },
  identity: { alignItems: 'flex-start', gap: spacing.sm },
  serviceTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: nativeFonts.semibold,
    color: x.day.text,
  },
  route: { fontSize: 24, lineHeight: 34, fontFamily: nativeFonts.bold },
  body: { fontSize: 15, lineHeight: 24, color: x.day.text },
  secondary: { fontSize: 13, lineHeight: 22, color: x.day.text },
  metaRow: { gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { flexShrink: 1 },
  details: { gap: spacing.sm, paddingTop: spacing.sm },
  fees: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.sm, backgroundColor: x.day.tintWarm },
  linePrice: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: x.day.price },
  toggle: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: x.day.text,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 23,
    color: x.brand.white,
    fontFamily: nativeFonts.semibold,
  },
  pressed: { opacity: 0.75 },
});
