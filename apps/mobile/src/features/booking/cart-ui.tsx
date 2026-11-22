import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCheckoutOperation, useApiSession, type TripAddonRequest } from '@tripflix/api-client';
import {
  calculateBookingCartChildDiscount,
  calculateBookingCartTotal,
  countBookingCartGuests,
  createBookingCartRequest,
  EMPTY_BOOKING_CART,
  findUnderCapacityStays,
  getBookingCartItemKey,
  listBookingCartLineTotals,
  listBookingCartStays,
  mergeBookingCart,
  setBookingCartItemQty,
  type BookingCart,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  formatDate,
  Icon,
  money,
  Notice,
  PriceRow,
  Row,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { CartLineIssue, useBookingCartCheck } from './cart-check';
import { CommerceError } from './commerce-state';
import { NO_ADDON_PICKS, TripAddonsSection, type TripAddonPicks } from './trip-addons-section';
import { saveBookingCart, saveBookingSelection, useBookingCart, useBookingSelection } from './cart-store';

const text = vi.commerce;

/** Nút − số + dùng cho số khách và số phòng. */
export function Stepper({
  value,
  label,
  canDecrease,
  canIncrease,
  onChange,
  unit,
}: {
  value: number;
  label: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (value: number) => void;
  unit?: string;
}) {
  const button = (sign: '−' | '+', isEnabled: boolean, next: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sign === '+' ? vi.hotel.increaseGuests : vi.hotel.decreaseGuests} ${label}`}
      disabled={!isEnabled}
      accessibilityState={{ disabled: !isEnabled }}
      onPress={() => onChange(next)}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.sm,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt style={{ color: isEnabled ? colors.navy : colors.textSubtle, fontSize: 18, lineHeight: 26 }}>
        {sign}
      </Txt>
    </Pressable>
  );
  return (
    <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
      {button('−', canDecrease, value - 1)}
      <Txt
        style={{
          minWidth: unit ? 56 : 20,
          textAlign: 'center',
          fontSize: 14,
          lineHeight: 23,
          fontFamily: nativeFonts.semibold,
        }}
      >
        {value}
        {unit ? ` ${unit}` : ''}
      </Txt>
      {button('+', canIncrease, value + 1)}
    </Row>
  );
}

export function CartWarnings({ cart }: { cart: BookingCart }) {
  return findUnderCapacityStays(cart).map((stay) => (
    <Notice key={stay.propertyName} tone="warning">
      {stay.propertyName}:{' '}
      {stay.reason === 'adults'
        ? `${text.cartNeedAdults} ${stay.rooms} ${text.cartRooms}, ${cart.adults} ${text.cartAdultsUnit}.`
        : `${text.cartUnderCapacity} ${stay.capacity}/${countBookingCartGuests(cart)} ${text.guests}.`}
    </Notice>
  ));
}

/**
 * Giữ chỗ các phòng truyền vào cùng vé chọn từ gợi ý (TF39) trong một đơn, xoá giỏ rồi sang thanh toán.
 * Không nhét thêm vé vào đơn đã giữ được, nên vé gợi ý phải đi chung lần POST /checkout này.
 */
function useHoldCart(
  cart: BookingCart,
  saveCart: (cart: BookingCart) => void,
  addonFlights: readonly { productId: string; ratePlanCode: string; date: string }[] = [],
) {
  // Giữ một operation để bấm lại sau lỗi mạng gửi đúng Idempotency-Key cũ.
  const [createCheckout] = useState(createCheckoutOperation);
  return useMutation({
    retry: false,
    mutationFn: () => {
      const request = createBookingCartRequest(cart);
      return createCheckout({
        ...request,
        items: [
          ...request.items,
          ...addonFlights.map((flight) => ({
            productId: flight.productId,
            checkIn: flight.date,
            ratePlanCode: flight.ratePlanCode,
          })),
        ],
      });
    },
    onSuccess: (order) => {
      saveCart(EMPTY_BOOKING_CART);
      router.push({ pathname: '/checkout', params: { id: order.orderId } });
    },
  });
}

/** Biểu tượng giỏ ở đầu màn; đổi tài khoản thì xoá giỏ để người sau không thấy giỏ người trước. */
export function CartLink() {
  const cart = useBookingCart();
  const { user, isReady } = useApiSession();
  const lastUserId = useRef<string | null>(null);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!isReady) return;
    if (lastUserId.current && lastUserId.current !== userId) {
      saveBookingCart(EMPTY_BOOKING_CART);
      saveBookingSelection(EMPTY_BOOKING_CART);
    }
    lastUserId.current = userId;
  }, [isReady, userId]);
  if (!user) return null;
  const count = cart.items.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text.cartTitle}: ${count}`}
      onPress={() => router.push('/cart')}
      style={{ padding: spacing.xs }}
    >
      <Icon name="bag-handle-outline" size={24} />
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: colors.coral,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="small" style={{ color: colors.background, fontSize: 11, fontWeight: '700' }}>
            {count}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

/** Thanh đáy trang khách sạn: phòng đang chọn, chưa vào giỏ. */
export function SelectionBar({ returnTo }: { returnTo: string }) {
  const selection = useBookingSelection();
  const cart = useBookingCart();
  const hold = useHoldCart(selection, saveBookingSelection);
  const { user, isReady } = useApiSession();
  const [notice, setNotice] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  if (isAdded && selection.items.length) setIsAdded(false);

  if (!selection.items.length) {
    if (!isAdded) return null;
    return (
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="label" style={{ color: colors.tealInk }}>
          ✓ {text.cartAdded}
        </Txt>
        <Button tone="secondary" onPress={() => router.push('/cart')}>
          {text.cartView}
        </Button>
      </Row>
    );
  }

  const addToCart = () => {
    const result = mergeBookingCart(cart, selection);
    if (result.outcome === 'added') {
      saveBookingCart(result.cart);
      saveBookingSelection(EMPTY_BOOKING_CART);
      setNotice('');
      setIsAdded(true);
      return;
    }
    setNotice(
      result.outcome === 'full'
        ? text.cartFull
        : `${text.cartAdultsMismatch} ${countBookingCartGuests(cart)} ${text.guests}.`,
    );
  };
  const roomCount = selection.items.reduce((sum, line) => sum + line.qty, 0);
  const discount = calculateBookingCartChildDiscount(selection);
  const isBlocked = findUnderCapacityStays(selection).length > 0;
  return (
    <View style={{ gap: spacing.sm }}>
      <Row
        style={{ justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm }}
      >
        <Txt variant="small" style={ui.muted}>
          {roomCount} {text.cartRooms} · {text.cartSubtotal}
        </Txt>
        <Txt variant="heading">{money(calculateBookingCartTotal(selection))}</Txt>
      </Row>
      {discount > 0 && (
        <Txt variant="small" style={{ color: colors.tealInk }}>
          {text.cartChildSurcharge} {money(discount)}
        </Txt>
      )}
      {listBookingCartStays(selection).map((stay) => (
        <Txt key={stay.key} variant="small" style={ui.muted} numberOfLines={1}>
          {stay.propertyName} · {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)} · {stay.rooms}{' '}
          {text.cartRooms}
        </Txt>
      ))}
      <CartWarnings cart={selection} />
      {notice !== '' && <Notice tone="error">{notice}</Notice>}
      <CommerceError error={hold.error} />
      <Row style={{ gap: spacing.sm }}>
        <Button
          tone="text"
          style={cartStyles.secondaryAction}
          onPress={() => {
            saveBookingSelection(EMPTY_BOOKING_CART);
            setNotice('');
          }}
        >
          {text.cartClearSelection}
        </Button>
        <Button tone="secondary" disabled={isBlocked} onPress={addToCart} style={cartStyles.secondaryAction}>
          {text.cartAdd}
        </Button>
      </Row>
      {isReady && !user ? (
        <Button
          style={cartStyles.primaryAction}
          onPress={() => router.push({ pathname: '/login', params: { returnTo } })}
        >
          {text.login}
        </Button>
      ) : (
        <Button
          style={cartStyles.primaryAction}
          disabled={!isReady || hold.isPending || isBlocked}
          onPress={() => hold.mutate()}
        >
          {hold.isPending ? vi.api.loading : text.cartBook}
        </Button>
      )}
    </View>
  );
}

/** Giỏ nhiều phòng, nhiều khách sạn; bấm Đặt ngay mới giữ cả đơn. */
export function CartScreen() {
  const cart = useBookingCart();
  const { user, isReady } = useApiSession();
  // Gợi ý vé khứ hồi cho các phòng trong giỏ (TF39), chọn thì giữ chỗ chung một đơn.
  const [addonFrom, setAddonFrom] = useState<string | null>(null);
  const addonRequest: TripAddonRequest | null = cart.items.length
    ? {
        items: cart.items.map((line) => ({
          type: 'hotel' as const,
          hotelId: line.propertyId,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
        })),
        adults: cart.adults,
        ...(addonFrom ? { fromAirport: addonFrom } : {}),
      }
    : null;
  const addonKey = JSON.stringify(addonRequest);
  const [addonState, setAddonState] = useState<{ key: string; picks: TripAddonPicks }>({
    key: addonKey,
    picks: NO_ADDON_PICKS,
  });
  const addonPicks = addonState.key === addonKey ? addonState.picks : NO_ADDON_PICKS;
  const addonFlights = [addonPicks.outbound, addonPicks.inbound].flatMap((flight) =>
    flight ? [flight] : [],
  );
  const addonTotal = addonFlights.reduce((sum, flight) => sum + flight.totalPrice, 0);
  const hold = useHoldCart(cart, saveBookingCart, addonFlights);
  const check = useBookingCartCheck(cart, hold.error);
  if (!cart.items.length)
    return (
      <Screen title={text.cartTitle}>
        <Notice>{text.cartEmpty}</Notice>
        <Button onPress={() => router.navigate('/(tabs)/explore')}>{text.findHotel}</Button>
      </Screen>
    );
  const discount = calculateBookingCartChildDiscount(cart);
  const lineTotals = listBookingCartLineTotals(cart);
  const hasIssues = check.issues.size > 0;
  const isBlocked = findUnderCapacityStays(cart).length > 0 || hasIssues;
  return (
    <Screen
      title={text.cartTitle}
      footer={
        <>
          {discount > 0 && <PriceRow label={text.cartChildSurcharge} amount={money(discount)} />}
          {addonTotal > 0 && (
            <PriceRow label={vi.mobile.tripAddons.flightsLabel} amount={money(addonTotal)} />
          )}
          <PriceRow
            total
            label={text.cartSubtotal}
            amount={money(calculateBookingCartTotal(cart) + addonTotal)}
          />
          {isReady && !user ? (
            <Button
              style={cartStyles.primaryAction}
              icon="arrow-forward"
              onPress={() => router.push({ pathname: '/login', params: { returnTo: '/cart' } })}
            >
              {text.login}
            </Button>
          ) : (
            <Button
              style={cartStyles.primaryAction}
              icon="arrow-forward"
              disabled={!isReady || hold.isPending || isBlocked}
              onPress={() => hold.mutate()}
            >
              {hold.isPending ? vi.api.loading : text.cartBook}
            </Button>
          )}
        </>
      }
    >
      <Txt variant="small" style={ui.muted}>
        {countBookingCartGuests(cart)} {text.guests} · {text.cartNoHold}
      </Txt>
      {check.isChecking && (
        <Txt variant="small" style={ui.muted}>
          {text.cartChecking}
        </Txt>
      )}
      {cart.items.map((line, lineIndex) => {
        const key = getBookingCartItemKey(line);
        const setQty = (qty: number) => saveBookingCart(setBookingCartItemQty(cart, key, qty));
        const issue = check.issues.get(key);
        return (
          <Card key={key} style={cartStyles.card}>
            <Txt style={cartStyles.property}>{line.propertyName}</Txt>
            <Txt style={cartStyles.room}>{line.roomName}</Txt>
            <Txt style={cartStyles.secondary}>{line.ratePlanName}</Txt>
            <Row style={cartStyles.dates}>
              <View style={cartStyles.date}>
                <Txt style={cartStyles.secondary}>{vi.hotel.checkIn}</Txt>
                <Txt style={cartStyles.dateValue}>{formatDate(line.checkIn)}</Txt>
              </View>
              <View style={cartStyles.date}>
                <Txt style={cartStyles.secondary}>{vi.hotel.checkOut}</Txt>
                <Txt style={cartStyles.dateValue}>{formatDate(line.checkOut)}</Txt>
              </View>
            </Row>
            <View style={{ gap: spacing.xs }}>
              <Txt style={cartStyles.secondary}>
                {t('commerce.cartLinePeriod', {
                  rooms: line.qty,
                  nights: Math.max(
                    1,
                    Math.round((Date.parse(line.checkOut) - Date.parse(line.checkIn)) / 86400000),
                  ),
                })}
              </Txt>
              <Txt style={cartStyles.price}>{money(lineTotals[lineIndex] ?? 0)}</Txt>
            </View>
            <Row style={cartStyles.controls}>
              <Stepper
                value={line.qty}
                label={line.roomName}
                unit={text.cartRooms}
                canDecrease
                canIncrease={line.qty < line.maxQty}
                onChange={setQty}
              />
              {!issue && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${text.cartRemove} ${line.roomName}`}
                  onPress={() => setQty(0)}
                  style={({ pressed }) => [cartStyles.remove, pressed && { opacity: 0.7 }]}
                >
                  <Icon name="trash-outline" size={18} color={colors.textMuted} />
                  <Txt style={cartStyles.secondary}>{text.cartRemove}</Txt>
                </Pressable>
              )}
            </Row>
            {issue ? (
              <CartLineIssue
                cart={cart}
                line={line}
                issue={issue}
                provinceSlug={check.provinceByProperty.get(line.propertyId)}
              />
            ) : null}
          </Card>
        );
      })}
      {/* Gợi ý vé khứ hồi trước khi giữ chỗ (TF39); vé chọn được giữ chung đơn với các phòng. */}
      <TripAddonsSection
        request={addonRequest}
        picks={addonPicks}
        onChangePicks={(picks) => setAddonState({ key: addonKey, picks })}
        onChangeFrom={setAddonFrom}
      />
      {/* Cảnh báo và lỗi nằm trong phần cuộn để thanh đáy chỉ còn tổng tiền và nút đặt, không che nửa màn hình. */}
      <CartWarnings cart={cart} />
      {hasIssues ? <Notice tone="error">{text.cartFixIssues}</Notice> : <CommerceError error={hold.error} />}
    </Screen>
  );
}

const cartStyles = StyleSheet.create({
  primaryAction: { borderRadius: radius.sm, backgroundColor: colors.coralInk, minHeight: 52 },
  secondaryAction: { borderRadius: radius.sm, minHeight: 44, flex: 1 },
  card: {
    borderRadius: radius.md,
    borderWidth: 0,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  property: { fontSize: 18, lineHeight: 28, fontFamily: nativeFonts.semibold, color: colors.navy },
  room: { fontSize: 15, lineHeight: 24, fontFamily: nativeFonts.medium, color: colors.navy },
  secondary: { fontSize: 13, lineHeight: 22, color: colors.textMuted },
  dates: { gap: spacing.md, flexWrap: 'wrap' },
  date: { flexGrow: 1, flexBasis: 120, gap: spacing.xs },
  dateValue: { fontSize: 14, lineHeight: 23, fontFamily: nativeFonts.medium, color: colors.navy },
  price: { fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: colors.navy },
  controls: { justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  remove: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
