import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCheckoutOperation, useApiSession } from '@tripflix/api-client';
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
import { vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, formatDate, Icon, money, Notice, PriceRow, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';
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
      onPress={() => onChange(next)}
      style={{
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: isEnabled ? colors.ink : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt variant="label" style={{ color: isEnabled ? colors.ink : colors.textSubtle }}>
        {sign}
      </Txt>
    </Pressable>
  );
  return (
    <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
      {button('−', canDecrease, value - 1)}
      <Txt variant="label" style={{ minWidth: unit ? 56 : 20, textAlign: 'center' }}>
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

/** Giữ chỗ các phòng truyền vào, xoá chúng khỏi nơi lưu rồi sang thanh toán. */
function useHoldCart(cart: BookingCart, saveCart: (cart: BookingCart) => void) {
  // Giữ một operation để bấm lại sau lỗi mạng gửi đúng Idempotency-Key cũ.
  const [createCheckout] = useState(createCheckoutOperation);
  return useMutation({
    retry: false,
    mutationFn: () => createCheckout(createBookingCartRequest(cart)),
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
      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
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
          onPress={() => {
            saveBookingSelection(EMPTY_BOOKING_CART);
            setNotice('');
          }}
        >
          {text.cartClearSelection}
        </Button>
        <Button tone="secondary" disabled={isBlocked} onPress={addToCart} style={{ flex: 1 }}>
          {text.cartAdd}
        </Button>
        {isReady && !user ? (
          <Button
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/login', params: { returnTo } })}
          >
            {text.login}
          </Button>
        ) : (
          <Button
            style={{ flex: 1 }}
            disabled={!isReady || hold.isPending || isBlocked}
            onPress={() => hold.mutate()}
          >
            {hold.isPending ? vi.api.loading : text.cartBook}
          </Button>
        )}
      </Row>
    </View>
  );
}

/** Giỏ nhiều phòng, nhiều khách sạn; bấm Đặt ngay mới giữ cả đơn. */
export function CartScreen() {
  const cart = useBookingCart();
  const { user, isReady } = useApiSession();
  const hold = useHoldCart(cart, saveBookingCart);
  if (!cart.items.length)
    return (
      <Screen title={text.cartTitle}>
        <Notice>{text.cartEmpty}</Notice>
        <Button onPress={() => router.push('/search')}>{text.findHotel}</Button>
      </Screen>
    );
  const discount = calculateBookingCartChildDiscount(cart);
  const lineTotals = listBookingCartLineTotals(cart);
  const isBlocked = findUnderCapacityStays(cart).length > 0;
  return (
    <Screen
      title={text.cartTitle}
      footer={
        <>
          {discount > 0 && <PriceRow label={text.cartChildSurcharge} amount={money(discount)} />}
          <PriceRow total label={text.cartSubtotal} amount={money(calculateBookingCartTotal(cart))} />
          <CartWarnings cart={cart} />
          <CommerceError error={hold.error} />
          {isReady && !user ? (
            <Button
              icon="arrow-forward"
              onPress={() => router.push({ pathname: '/login', params: { returnTo: '/cart' } })}
            >
              {text.login}
            </Button>
          ) : (
            <Button
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
      {cart.items.map((line, lineIndex) => {
        const key = getBookingCartItemKey(line);
        const setQty = (qty: number) => saveBookingCart(setBookingCartItemQty(cart, key, qty));
        return (
          <Card key={key}>
            <Badge icon="bed-outline">{line.propertyName}</Badge>
            <Txt variant="heading">{line.roomName}</Txt>
            <Txt variant="small" style={ui.muted}>
              {line.ratePlanName} · {formatDate(line.checkIn)} → {formatDate(line.checkOut)}
            </Txt>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Stepper
                value={line.qty}
                label={line.roomName}
                unit={text.cartRooms}
                canDecrease
                canIncrease={line.qty < line.maxQty}
                onChange={setQty}
              />
              <Txt variant="heading">{money(lineTotals[lineIndex] ?? 0)}</Txt>
            </Row>
            <Button tone="text" onPress={() => setQty(0)}>
              {text.cartRemove}
            </Button>
          </Card>
        );
      })}
    </Screen>
  );
}
