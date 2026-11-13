import { useState } from 'react';
import type { CommerceHotel } from '@tripflix/api-client';
import {
  addBookingCartItem,
  BOOKING_CART_MAX_ROOMS,
  calculateChildStayDiscount,
  countBookingCartGuests,
  getBookingCartItemKey,
  setBookingCartItemQty,
  type BookingCartItem,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Icon, money, Notice, Row, Txt, ui } from '@/components/mobile-ui';
import { saveBookingSelection, useBookingSelection } from './cart-store';

const text = vi.commerce;
const hotelText = vi.hotel;
export type Guests = { adults: number; children: number; infants: number };
type Room = CommerceHotel['rooms'][number];
type Rate = Room['ratePlans'][number];

const nightsBetween = (from: string, to: string) =>
  Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000));
const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

/** Ảnh lướt ngang như ảnh phòng, cắt vừa khung theo tỉ lệ; dùng cho ảnh khách sạn và loại phòng. */
export function PhotoGallery({
  images,
  name,
  ratio = 4 / 3,
  rounded = radius.md,
  counterBottom = spacing.sm,
  height,
}: {
  images: string[];
  name: string;
  ratio?: number;
  rounded?: number;
  /** Ảnh đầu trang bị thẻ thông tin đè lên đáy nên đẩy bộ đếm lên cao hơn. */
  counterBottom?: number;
  /** Chiều cao cố định thay cho tỉ lệ (ảnh đầu trang co giãn cho vừa màn hình). */
  height?: number;
}) {
  // Đo đúng bề rộng khung rồi cho ảnh vừa khung, ảnh to nhỏ khác nhau vẫn đều.
  const [frameWidth, setFrameWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const slideWidth = Math.max(frameWidth, 1);
  const slideHeight = height ?? Math.round(slideWidth / ratio);
  // Khung luôn giữ tỉ lệ và luôn đo bề rộng, kể cả lúc chưa có ảnh, để ảnh tới sau vẫn hiện đúng cỡ.
  return (
    <View
      onLayout={(event) => setFrameWidth(Math.round(event.nativeEvent.layout.width))}
      style={{
        ...(height ? { height } : { aspectRatio: ratio }),
        borderRadius: rounded,
        overflow: 'hidden',
        backgroundColor: colors.seaMist,
      }}
    >
      {!images.length && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="image-outline" size={40} color={colors.tealInk} />
        </View>
      )}
      {frameWidth > 0 && images.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth))}
          scrollEventThrottle={64}
          style={{ borderRadius: rounded }}
        >
          {images.map((uri) => (
            <Image
              key={uri}
              source={uri}
              style={{ width: slideWidth, height: slideHeight }}
              contentPosition="center"
              contentFit="cover"
              accessibilityLabel={name}
            />
          ))}
        </ScrollView>
      )}
      {images.length > 1 && (
        <View
          style={{
            position: 'absolute',
            right: spacing.sm,
            bottom: counterBottom,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: colors.overlayHeavy,
          }}
        >
          <Txt variant="small" style={{ color: colors.background }}>
            {index + 1}/{images.length}
          </Txt>
        </View>
      )}
    </View>
  );
}

/** Nút "Chọn" của một gói giá; đã chọn thì thành bộ đếm phòng màu cam (giống bản thiết kế). */
function RateQty({
  booking,
  guests,
  isDisabled,
}: {
  booking: Omit<BookingCartItem, 'qty'>;
  guests: Guests;
  isDisabled: boolean;
}) {
  const selection = useBookingSelection();
  const [notice, setNotice] = useState('');
  const key = getBookingCartItemKey(booking);
  const line = selection.items.find((item) => getBookingCartItemKey(item) === key);
  const selectQty = (qty: number) => {
    if (line) {
      saveBookingSelection(setBookingCartItemQty(selection, key, qty));
      return;
    }
    if (qty === 0) return;
    const result = addBookingCartItem(selection, { ...booking, qty }, guests);
    if (result.outcome !== 'added') {
      setNotice(
        result.outcome === 'full'
          ? text.cartFull
          : `${text.cartAdultsMismatch} ${countBookingCartGuests(selection)} ${text.guests}.`,
      );
      return;
    }
    setNotice('');
    saveBookingSelection(result.cart);
  };
  const qty = line?.qty ?? 0;
  const pillButton = (sign: '−' | '+', isEnabled: boolean, next: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sign === '+' ? text.cartIncrease : text.cartDecrease}: ${booking.ratePlanName}`}
      disabled={!isEnabled}
      onPress={() => selectQty(next)}
      style={{
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.coralSoft,
        opacity: isEnabled ? 1 : 0.5,
      }}
    >
      <Txt variant="label" style={{ color: colors.background }}>
        {sign}
      </Txt>
    </Pressable>
  );
  return (
    <View style={{ gap: spacing.xs }}>
      {qty === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${hotelText.pickRate} ${booking.ratePlanName}`}
          disabled={isDisabled}
          onPress={() => selectQty(1)}
          style={{
            alignItems: 'center',
            paddingVertical: 12,
            borderRadius: radius.pill,
            backgroundColor: colors.coral,
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          <Txt variant="label" style={{ color: colors.background }}>
            {hotelText.pickRate}
          </Txt>
        </Pressable>
      ) : (
        <Row
          style={{
            gap: spacing.sm,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.coral,
          }}
        >
          {pillButton('−', !isDisabled, qty - 1)}
          <Txt variant="label" style={{ color: colors.background }}>
            {qty} {text.cartRooms}
          </Txt>
          {pillButton('+', !isDisabled && qty < booking.maxQty, qty + 1)}
        </Row>
      )}
      {notice !== '' && <Notice tone="error">{notice}</Notice>}
    </View>
  );
}

function CheckLine({ children, tone = colors.ink }: { children: string; tone?: string }) {
  return (
    <Row style={{ gap: 6, alignItems: 'flex-start' }}>
      <Icon name="checkmark" size={15} color={tone === colors.ink ? colors.teal : tone} />
      <Txt variant="small" style={{ flex: 1, color: tone, lineHeight: 19 }}>
        {children}
      </Txt>
    </Row>
  );
}

/** Một gói giá là một ô riêng như Agoda: danh sách ✓ bên trái, giá bên phải, nút đặt ở đáy ô. */
function RateRow({
  hotel,
  room,
  rate,
  stay,
  rooms,
  isDisabled,
  onPick,
  pickedRatePlanCode,
}: {
  hotel: CommerceHotel;
  room: Room;
  rate: Rate;
  stay: Guests;
  rooms: number;
  isDisabled: boolean;
  onPick?: (ratePlanCode: string) => void;
  pickedRatePlanCode?: string;
}) {
  const selection = useBookingSelection();
  const isSelected = onPick
    ? pickedRatePlanCode === rate.code
    : selection.items.some((item) => item.productId === room.productId && item.ratePlanCode === rate.code);
  const fitsParty = !!onPick || rooms <= stay.adults;
  const pricePerRoom = rate.totalPrice === null ? null : Math.round(rate.totalPrice / room.roomsNeeded);
  const stayTotal = pricePerRoom === null ? null : rooms * pricePerRoom;
  const discount =
    onPick || stayTotal === null || !fitsParty
      ? 0
      : calculateChildStayDiscount({ stayTotal, capacity: rooms * room.maxGuests, children: stay.children });
  const nights = nightsBetween(hotel.stay.checkIn, hotel.stay.checkOut);
  const perNight =
    rate.pricePerNight === null ? null : rate.pricePerNight - Math.round(discount / rooms / nights);
  const policy = rate.isRefundable
    ? t('hotel.freeCancel', { days: rate.freeCancelDays })
    : text.nonRefundable;
  const hasSaving = rate.discountPct !== null && rate.discountPct > 0 && stay.children === 0;
  return (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.coral : colors.border,
        backgroundColor: isSelected ? colors.coralTint : colors.background,
      }}
    >
      <Txt variant="label">{rate.name}</Txt>
      <View style={{ gap: 6 }}>
        <CheckLine tone={rate.isRefundable ? colors.tealInk : colors.textMuted}>{policy}</CheckLine>
        {rate.perks.map((perk) => (
          <CheckLine key={perk}>{perk}</CheckLine>
        ))}
      </View>
      {/* Giá một hàng riêng: bên trái % giảm + giá gạch, bên phải giá mỗi đêm. */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 2 }}>
          {hasSaving && (
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 6,
                borderRadius: radius.sm,
                backgroundColor: colors.coral,
              }}
            >
              <Txt variant="small" style={{ color: colors.background, fontWeight: '700' }}>
                -{rate.discountPct}%
              </Txt>
            </View>
          )}
          {rate.listPricePerNight !== null && perNight !== null && rate.listPricePerNight > perNight && (
            <Txt variant="small" style={{ color: colors.textSubtle, textDecorationLine: 'line-through' }}>
              {money(rate.listPricePerNight)}
            </Txt>
          )}
        </View>
        {perNight === null ? (
          <Txt variant="small" style={ui.muted}>
            {hotelText.rateUnavailable}
          </Txt>
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="heading" style={{ color: colors.coralInk }}>
              {money(perNight)}
            </Txt>
            <Txt variant="small" style={ui.muted}>
              {hotelText.perNightShort}
            </Txt>
          </View>
        )}
      </Row>
      {stayTotal !== null && !fitsParty && (
        <Txt variant="small" style={ui.muted}>
          {hotelText.cannotFitParty}
        </Txt>
      )}
      {discount > 0 && (
        <Txt variant="small" style={{ color: colors.tealInk }}>
          {text.cartChildSurcharge} {money(discount)}
        </Txt>
      )}
      {room.isAvailable && pricePerRoom !== null && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
          {onPick ? (
            <Button disabled={isDisabled} onPress={() => onPick(rate.code)}>
              {isSelected ? vi.mobile.tripPlan.picked : hotelText.pickRate}
            </Button>
          ) : (
            <RateQty
              booking={{
                productId: room.productId,
                ratePlanCode: rate.code,
                checkIn: hotel.stay.checkIn,
                checkOut: hotel.stay.checkOut,
                propertyId: hotel.id,
                propertyName: hotel.name,
                roomName: room.name,
                ratePlanName: rate.name,
                maxGuests: room.maxGuests,
                stayPricePerRoom: pricePerRoom,
                maxQty: Math.min(room.remaining ?? BOOKING_CART_MAX_ROOMS, BOOKING_CART_MAX_ROOMS),
              }}
              guests={stay}
              isDisabled={isDisabled}
            />
          )}
        </View>
      )}
    </View>
  );
}

const AMENITY_PREVIEW = 6;

function Fact({ icon, children }: { icon: Parameters<typeof Icon>[0]['name']; children: string }) {
  return (
    <Row style={{ gap: 4, alignItems: 'center' }}>
      <Icon name={icon} size={15} color={colors.textMuted} />
      <Txt variant="small">{children}</Txt>
    </Row>
  );
}

/** Thẻ loại phòng như Agoda: ảnh trên cùng, thông số + tiện nghi có biểu tượng, mỗi gói giá một ô. */
export function RoomCard({
  hotel,
  room,
  stay,
  rooms,
  isDisabled,
  onPick,
  pickedRatePlanCode,
}: {
  hotel: CommerceHotel;
  room: Room;
  stay: Guests;
  rooms: number;
  isDisabled: boolean;
  onPick?: (ratePlanCode: string) => void;
  pickedRatePlanCode?: string;
}) {
  const [isAmenityOpen, setAmenityOpen] = useState(false);
  const amenities = isAmenityOpen ? room.amenities : room.amenities.slice(0, AMENITY_PREVIEW);
  const hiddenAmenities = room.amenities.length - AMENITY_PREVIEW;
  return (
    <View
      style={{
        borderRadius: radius.lg * 1.5,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        overflow: 'hidden',
      }}
    >
      <PhotoGallery images={room.images} name={room.name} ratio={16 / 10} rounded={0} />
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <Txt variant="heading">{room.name}</Txt>
          <Row style={{ flexWrap: 'wrap', columnGap: spacing.md, rowGap: 4 }}>
            {room.areaM2 !== null && room.areaM2 !== undefined && (
              <Fact icon="resize-outline">{`${room.areaM2} m²`}</Fact>
            )}
            <Fact icon="people-outline">{`${hotelText.maxGuests} ${room.maxGuests} ${text.guests}`}</Fact>
            {room.bedType && <Fact icon="bed-outline">{room.bedType}</Fact>}
            {room.view && <Fact icon="image-outline">{labelOf(hotelText.views, room.view)}</Fact>}
          </Row>
        </View>
        {room.amenities.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Row style={{ flexWrap: 'wrap', columnGap: spacing.md, rowGap: 6 }}>
              {amenities.map((amenity) => (
                <Row key={amenity} style={{ gap: 4, alignItems: 'center', width: '46%' }}>
                  <Icon name="checkmark-circle-outline" size={15} color={colors.teal} />
                  <Txt variant="small" numberOfLines={1} style={{ flexShrink: 1, color: colors.textMuted }}>
                    {amenity}
                  </Txt>
                </Row>
              ))}
            </Row>
            {hiddenAmenities > 0 && (
              <Pressable accessibilityRole="button" onPress={() => setAmenityOpen((open) => !open)}>
                <Txt variant="small" style={{ color: colors.tealInk, fontWeight: '600' }}>
                  {isAmenityOpen ? hotelText.showLess : t('hotel.moreAmenities', { count: hiddenAmenities })}
                </Txt>
              </Pressable>
            )}
          </View>
        )}
        {room.remaining !== null && room.remaining <= 5 && (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.sm,
              backgroundColor: colors.coralTint,
            }}
          >
            <Txt variant="small" style={{ color: colors.coralInk, fontWeight: '600' }}>
              {t('hotel.roomsLeft', { count: room.remaining })}
            </Txt>
          </View>
        )}
        {!room.isAvailable && (
          <Notice tone="warning">{room.reason ? text.reasons[room.reason] : text.unavailable}</Notice>
        )}
        {room.ratePlans.map((rate) => (
          <RateRow
            key={rate.code}
            hotel={hotel}
            room={room}
            rate={rate}
            stay={stay}
            rooms={rooms}
            onPick={onPick}
            pickedRatePlanCode={pickedRatePlanCode}
            isDisabled={isDisabled}
          />
        ))}
      </View>
    </View>
  );
}
