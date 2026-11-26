import { useState } from 'react';
import type { CheckoutDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, nativeFonts } from '@tripflix/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDate, Icon, Logo, money, Row, Txt } from '@/components/mobile-ui';
import { HoldTimer } from './commerce-state';

const text = vi.commerce;

/** Read held-order values so the summary reflects the prices, dates and terms of this order. */
export function CheckoutSummary({
  order,
  total,
  showHoldTimer,
}: {
  order: CheckoutDto;
  total: number;
  showHoldTimer: boolean;
}) {
  const [isExpanded, setExpanded] = useState(false);
  const hasRooms = order.items.some((item) => item.productType === 'room');
  return (
    <View style={styles.panel}>
      <View testID="checkout-ticket" style={styles.ticket}>
        <View style={styles.header}>
          <View style={styles.logoPlate}>
            <Logo />
          </View>
          <Txt accessibilityRole="header" style={styles.title}>
            {text.checkoutSummaryTitle}
          </Txt>
          <Txt style={styles.count}>
            {t('commerce.checkoutSummaryCount', {
              services: order.items.length,
              guests: order.adults + order.children + order.infants,
            })}
          </Txt>
          {showHoldTimer && (
            <Row style={styles.timer}>
              <Icon name="time-outline" size={15} color={x.day.link} />
              <HoldTimer expiresAt={order.holdExpiresAt} style={styles.timerText} />
            </Row>
          )}
        </View>

        <View style={styles.services}>
          {order.items.map((item, index) => {
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
              <View key={item.id} style={[styles.service, index > 0 && styles.serviceDivider]}>
                <Icon name={isFlight ? 'airplane-outline' : 'bed-outline'} size={19} color={x.day.link} />
                <View style={styles.serviceInfo}>
                  <Txt style={[styles.serviceTitle, isFlight && styles.route]}>{title}</Txt>
                  {!isFlight && <Txt style={styles.body}>{item.productName}</Txt>}
                  <Txt style={styles.secondary}>
                    {isFlight
                      ? formatDate(item.date)
                      : `${formatDate(item.date)} → ${formatDate(item.dateTo)}`}
                  </Txt>
                  <Row style={styles.metaRow}>
                    <Txt style={styles.quantity}>
                      {isFlight
                        ? t('commerce.checkoutFlightQuantity', { count: item.qty })
                        : t('commerce.checkoutRoomQuantity', { count: item.qty, nights: item.nights })}
                    </Txt>
                    <Txt style={styles.itemPrice}>{money(item.lineTotal)}</Txt>
                  </Row>
                  {isExpanded && (
                    <View style={styles.details}>
                      {isFlight && title !== item.productName && (
                        <Txt style={styles.body}>{item.productName}</Txt>
                      )}
                      <Txt style={styles.body}>{item.ratePlanName}</Txt>
                      <Txt style={styles.secondary}>{policy}</Txt>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Txt style={styles.toggleLabel}>
            {isExpanded ? text.checkoutCollapseSummary : text.checkoutExpandSummary}
          </Txt>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={x.day.link} />
        </Pressable>
        <View style={styles.receiptBottom}>
          <View style={styles.perforation} />
          <View pointerEvents="none" style={[styles.notch, styles.leftNotch]} />
          <View pointerEvents="none" style={[styles.notch, styles.rightNotch]} />
          <Row style={styles.totalRow}>
            <Txt style={styles.totalLabel}>{text.total}</Txt>
            <Txt style={styles.receiptTotal}>{money(total)}</Txt>
          </Row>
          <View pointerEvents="none" style={styles.paperEdge}>
            {Array.from({ length: 14 }, (_, tooth) => (
              <View key={tooth} style={styles.paperTooth} />
            ))}
          </View>
        </View>
      </View>
      {hasRooms && (
        <Row style={styles.fees}>
          <Icon name="information-circle-outline" size={21} color={x.day.link} />
          <View style={styles.feeCopy}>
            <Txt style={styles.feeTitle}>{text.checkoutPropertyFees}</Txt>
            <Txt style={styles.secondary}>{text.checkoutPropertyFeesUnknown}</Txt>
          </View>
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: x.space.sm },
  ticket: {
    borderWidth: 1,
    borderColor: x.day.line,
    borderTopLeftRadius: x.radius.lg,
    borderTopRightRadius: x.radius.lg,
    overflow: 'hidden',
    backgroundColor: x.day.surface,
  },
  header: {
    alignItems: 'center',
    gap: x.space.xxs,
    padding: x.space.lg,
    backgroundColor: x.day.tintExplore,
    borderTopWidth: x.space.xxs,
    borderTopColor: x.day.link,
    borderBottomWidth: 1,
    borderBottomColor: x.day.line,
  },
  logoPlate: { paddingHorizontal: x.space.xs, borderRadius: x.radius.sm, backgroundColor: x.day.surface },
  count: { fontSize: 13, lineHeight: 20, fontFamily: nativeFonts.medium, color: x.day.text },
  title: {
    fontSize: 25,
    lineHeight: 33,
    letterSpacing: -0.5,
    fontFamily: nativeFonts.bold,
    color: x.day.text,
    textAlign: 'center',
  },
  timer: {
    alignItems: 'center',
    gap: x.space.xxs,
    marginTop: x.space.xxs,
    paddingHorizontal: x.space.xs,
    paddingVertical: x.space.xxs,
    borderRadius: x.radius.pill,
    backgroundColor: x.day.surface,
  },
  timerText: { color: x.day.link, fontSize: 13, lineHeight: 20, fontVariant: ['tabular-nums'] },
  services: { paddingHorizontal: x.space.md },
  service: { flexDirection: 'row', alignItems: 'flex-start', gap: x.space.xs, paddingVertical: x.space.sm },
  serviceDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: x.day.line },
  serviceInfo: { flex: 1, minWidth: 0, gap: x.space.xxs },
  serviceTitle: { fontSize: 16, lineHeight: 23, fontFamily: nativeFonts.semibold, color: x.day.text },
  route: { fontSize: 20, lineHeight: 26, letterSpacing: 0.25, fontFamily: nativeFonts.bold },
  body: { fontSize: 14, lineHeight: 21, color: x.day.text },
  secondary: { fontSize: 13, lineHeight: 19, color: x.day.textSecondary },
  metaRow: { gap: x.space.xxs, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' },
  quantity: { fontSize: 13, lineHeight: 19, color: x.day.textSecondary },
  itemPrice: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: nativeFonts.semibold,
    color: x.day.text,
    fontVariant: ['tabular-nums'],
  },
  details: { gap: x.space.xxs, marginTop: x.space.xxs, paddingVertical: x.space.xs },
  receiptBottom: { backgroundColor: x.day.tintExplore, paddingHorizontal: x.space.lg, paddingBottom: x.space.xl },
  perforation: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: x.day.input },
  notch: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: x.day.surface,
    zIndex: 1,
  },
  leftNotch: { left: -8 },
  rightNotch: { right: -8 },
  totalRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: x.space.xs,
    marginTop: x.space.md,
  },
  totalLabel: { fontSize: 15, lineHeight: 22, fontFamily: nativeFonts.semibold, color: x.day.text },
  receiptTotal: {
    fontSize: 23,
    lineHeight: 30,
    fontFamily: nativeFonts.bold,
    color: x.day.price,
    fontVariant: ['tabular-nums'],
  },
  paperEdge: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paperTooth: { width: 11, height: 11, backgroundColor: x.day.surface, transform: [{ rotate: '45deg' }] },
  fees: {
    alignItems: 'flex-start',
    gap: x.space.xs,
    paddingHorizontal: x.space.xs,
    paddingVertical: x.space.xxs,
  },
  feeCopy: { flex: 1, gap: x.space.xxs },
  feeTitle: { fontSize: 14, lineHeight: 20, fontFamily: nativeFonts.semibold, color: x.day.text },
  toggle: {
    minHeight: x.control.touch,
    paddingHorizontal: x.space.md,
    paddingVertical: x.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: x.space.sm,
  },
  toggleLabel: { flex: 1, fontSize: 14, lineHeight: 22, color: x.day.link, fontFamily: nativeFonts.semibold },
  pressed: { backgroundColor: x.day.tintExplore },
});
