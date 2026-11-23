import { useQueries, useQuery } from '@tanstack/react-query';
import { commerceApi, getAvailableStays, HttpError, useApiSession } from '@tripflix/api-client';
import {
  checkBookingCartLine,
  findSoldOutLineKeys,
  getAlternativePriceRange,
  getBookingCartItemKey,
  listBookingCartStayQueries,
  readSoldOutConflict,
  setBookingCartItemPrice,
  setBookingCartItemQty,
  type BookingCart,
  type BookingCartItem,
  type BookingCartLineIssue,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, money, Notice, Row, Txt, ui } from '@/components/mobile-ui';
import { saveBookingCart } from './cart-store';

const text = vi.commerce;
const ALTERNATIVE_COUNT = 3;

export interface BookingCartCheck {
  issues: ReadonlyMap<string, BookingCartLineIssue>;
  /** Tỉnh của khách sạn (slug), dùng tìm khách sạn thay thế. */
  provinceByProperty: ReadonlyMap<string, string>;
  isChecking: boolean;
}

/**
 * Giỏ không giữ chỗ nên mở giỏ là xem lại từng khách sạn: phòng còn không, đủ số phòng không, giá có đổi không.
 * Lỗi 409 SOLD_OUT lúc bấm Đặt ngay cũng đánh dấu đúng mục, vì có thể vừa có người đặt mất sau lần xem.
 */
export function useBookingCartCheck(cart: BookingCart, holdError: unknown): BookingCartCheck {
  const { isReady } = useApiSession();
  const adults = Math.min(Math.max(cart.adults, 1), 9);
  const stays = listBookingCartStayQueries(cart);
  const results = useQueries({
    queries: stays.map((stay) => ({
      queryKey: ['commerce', 'cart-check', stay.key, adults],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        commerceApi.getHotel(
          stay.propertyId,
          { checkIn: stay.checkIn, checkOut: stay.checkOut, adults },
          signal,
        ),
      enabled: isReady,
      staleTime: 0,
      retry: false,
    })),
  });
  const issues = new Map<string, BookingCartLineIssue>();
  const provinceByProperty = new Map<string, string>();
  stays.forEach((stay, index) => {
    const hotel = results[index]?.data;
    if (!hotel) return;
    provinceByProperty.set(stay.propertyId, hotel.province.slug);
    for (const line of cart.items) {
      if (
        line.propertyId !== stay.propertyId ||
        line.checkIn !== stay.checkIn ||
        line.checkOut !== stay.checkOut
      )
        continue;
      const issue = checkBookingCartLine(line, hotel.rooms);
      if (issue) issues.set(getBookingCartItemKey(line), issue);
    }
  });
  const conflict =
    holdError instanceof HttpError && holdError.status === 409 ? readSoldOutConflict(holdError.body) : null;
  if (conflict) for (const key of findSoldOutLineKeys(cart, conflict)) issues.set(key, { kind: 'sold_out' });
  return { issues, provinceByProperty, isChecking: results.some((result) => result.isFetching) };
}

/** Thông báo và cách xử lý cho một mục có vấn đề. */
export function CartLineIssue({
  cart,
  line,
  issue,
  provinceSlug,
}: {
  cart: BookingCart;
  line: BookingCartItem;
  issue: BookingCartLineIssue;
  provinceSlug?: string;
}) {
  const key = getBookingCartItemKey(line);
  if (issue.kind === 'price_changed')
    return (
      <View style={{ gap: spacing.sm }}>
        <Notice tone="error">
          {t('commerce.cartPriceChanged', {
            oldPrice: money(issue.oldPrice),
            newPrice: money(issue.newPrice),
          })}
        </Notice>
        <Button
          tone="secondary"
          onPress={() => saveBookingCart(setBookingCartItemPrice(cart, key, issue.newPrice))}
        >
          {text.cartAcceptPrice}
        </Button>
      </View>
    );
  if (issue.kind === 'not_enough')
    return (
      <View style={{ gap: spacing.sm }}>
        <Notice tone="error">{t('commerce.cartNotEnough', { remaining: issue.remaining })}</Notice>
        <Button
          tone="secondary"
          onPress={() => saveBookingCart(setBookingCartItemQty(cart, key, issue.remaining))}
        >
          {t('commerce.cartReduceTo', { remaining: issue.remaining })}
        </Button>
      </View>
    );
  return (
    <View style={{ gap: spacing.sm }}>
      <Notice tone="error">{text.cartSoldOut}</Notice>
      <Row style={{ gap: spacing.sm }}>
        <Button tone="secondary" style={{ flex: 1 }} onPress={() => openHotel(line.propertyId, line, cart)}>
          {text.cartPickOtherRoom}
        </Button>
        <Button tone="text" onPress={() => saveBookingCart(setBookingCartItemQty(cart, key, 0))}>
          {text.cartRemove}
        </Button>
      </Row>
      {provinceSlug && <AlternativeStays cart={cart} line={line} provinceSlug={provinceSlug} />}
    </View>
  );
}

function openHotel(hotelId: string, line: BookingCartItem, cart: BookingCart) {
  router.push({
    pathname: '/hotel/[id]',
    params: {
      id: hotelId,
      checkIn: line.checkIn,
      checkOut: line.checkOut,
      adults: String(cart.adults),
      children: String(cart.children),
    },
  });
}

/** Vài khách sạn cùng tỉnh, cùng ngày, giá một đêm quanh giá đã chọn. */
function AlternativeStays({
  cart,
  line,
  provinceSlug,
}: {
  cart: BookingCart;
  line: BookingCartItem;
  provinceSlug: string;
}) {
  const { priceMin, priceMax } = getAlternativePriceRange(line);
  const query = useQuery({
    queryKey: [
      'commerce',
      'cart-alternatives',
      provinceSlug,
      line.checkIn,
      line.checkOut,
      cart.adults,
      priceMin,
      priceMax,
    ],
    queryFn: ({ signal }) =>
      getAvailableStays(
        {
          placeId: provinceSlug,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          adults: String(Math.max(cart.adults, 1)),
          rooms: '',
          minStars: '',
          priceMin: String(priceMin),
          priceMax: String(priceMax),
          sort: 'price',
        },
        { signal, limit: ALTERNATIVE_COUNT + 1 },
      ),
  });
  const stays = (query.data?.items ?? [])
    .filter((stay) => stay.hotelId !== line.propertyId)
    .slice(0, ALTERNATIVE_COUNT);
  if (!stays.length) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <Txt variant="label">{text.cartAlternatives}</Txt>
      {stays.map((stay) => (
        <Pressable
          key={stay.hotelId}
          accessibilityRole="button"
          onPress={() => openHotel(stay.hotelId, line, cart)}
          style={{ paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: x.day.line }}
        >
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
            <Txt style={ui.flex} numberOfLines={1}>
              {stay.name}
              {stay.stars ? ` · ${stay.stars}★` : ''}
            </Txt>
            <Txt variant="small" style={{ color: x.day.text }}>
              {t('commerce.cartAlternativePrice', { price: money(stay.unitPrice) })}
            </Txt>
          </Row>
        </Pressable>
      ))}
    </View>
  );
}
