import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
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
import { explorer as x, colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, money, Notice, Row, Txt, ui } from '@/components/mobile-ui';
import { saveBookingSelection, useBookingSelection } from './cart-store';

const text = vi.commerce;
const hotelText = vi.hotel;
type PhotoStatus = 'loading' | 'loaded' | 'error' | 'timeout';
const PHOTO_WAIT_MS = 15_000;
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
  isLoading = false,
}: {
  images: string[];
  name: string;
  ratio?: number;
  rounded?: number;
  /** Khoảng cách bộ điều khiển ảnh tới đáy khung. */
  counterBottom?: number;
  /** Chiều cao cố định thay cho tỉ lệ. */
  height?: number;
  isLoading?: boolean;
}) {
  // Đo đúng bề rộng khung rồi cho ảnh vừa khung, ảnh to nhỏ khác nhau vẫn đều.
  const [frameWidth, setFrameWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, PhotoStatus>>({});
  const reportStatus = useCallback((uri: string, status: PhotoStatus) => {
    setStatuses((previous) => (previous[uri] === status ? previous : { ...previous, [uri]: status }));
  }, []);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const slideWidth = Math.max(frameWidth, 1);
  const slideHeight = height ?? Math.round(slideWidth / ratio);
  const currentStatus = statuses[images[index] ?? ''] ?? 'loading';
  const counterLabel =
    currentStatus === 'loaded'
      ? `${index + 1} / ${images.length}`
      : t(currentStatus === 'loading' ? 'hotel.photoCounterLoading' : 'hotel.photoCounterError', {
          current: index + 1,
          total: images.length,
        });
  // Khung luôn giữ tỉ lệ và luôn đo bề rộng, kể cả lúc chưa có ảnh, để ảnh tới sau vẫn hiện đúng cỡ.
  return (
    <View
      onLayout={(event) => setFrameWidth(Math.round(event.nativeEvent.layout.width))}
      style={{
        ...(height ? { height } : { aspectRatio: ratio }),
        borderRadius: rounded,
        overflow: 'hidden',
        backgroundColor: x.day.canvas,
      }}
    >
      {!images.length && (
        <View style={galleryStyles.placeholder}>
          <Icon name="image-outline" size={28} color={x.day.textSecondary} />
          <Txt style={galleryStyles.placeholderText}>
            {isLoading ? hotelText.photoLoading : hotelText.noPhotos}
          </Txt>
        </View>
      )}
      {frameWidth > 0 && images.length > 0 && (
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) =>
            setIndex(
              Math.max(
                0,
                Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / slideWidth)),
              ),
            )
          }
          scrollEventThrottle={64}
          style={{ flex: 1 }}
        >
          {images.map((uri, position) => (
            <GalleryPhoto
              key={`${uri}:${position}`}
              uri={uri}
              width={slideWidth}
              height={slideHeight}
              isActive={position === index}
              reportStatus={reportStatus}
              bottomInset={images.length > 1 ? counterBottom + 44 + spacing.sm : spacing.lg}
              label={`${name}. ${t('hotel.photoPosition', { current: position + 1, total: images.length })}`}
            />
          ))}
        </ScrollView>
      )}
      {images.length > 1 && (
        <View style={[galleryStyles.pager, { bottom: counterBottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hotelText.previous}
            accessibilityState={{ disabled: index === 0 }}
            disabled={index === 0}
            onPress={() => scroll.current?.scrollTo({ x: (index - 1) * slideWidth, animated: true })}
            style={({ pressed }) => [galleryStyles.control, (pressed || index === 0) && galleryStyles.dim]}
          >
            <Icon name="chevron-back" size={20} color={x.brand.white} />
          </Pressable>
          <View style={galleryStyles.counter}>
            <Txt
              accessibilityLabel={`${t('hotel.photoPosition', { current: index + 1, total: images.length })}. ${currentStatus === 'loaded' ? hotelText.photoLoaded : currentStatus === 'loading' ? hotelText.photoLoading : hotelText.imageUnavailable}`}
              style={galleryStyles.counterText}
            >
              {counterLabel}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hotelText.next}
            accessibilityState={{ disabled: index === images.length - 1 }}
            disabled={index === images.length - 1}
            onPress={() => scroll.current?.scrollTo({ x: (index + 1) * slideWidth, animated: true })}
            style={({ pressed }) => [
              galleryStyles.control,
              (pressed || index === images.length - 1) && galleryStyles.dim,
            ]}
          >
            <Icon name="chevron-forward" size={20} color={x.brand.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function GalleryPhoto({
  uri,
  width,
  height,
  label,
  isActive,
  bottomInset,
  reportStatus,
}: {
  uri: string;
  width: number;
  height: number;
  label: string;
  isActive: boolean;
  bottomInset: number;
  reportStatus: (uri: string, status: PhotoStatus) => void;
}) {
  const [status, setStatus] = useState<PhotoStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => reportStatus(uri, status), [uri, status, reportStatus]);
  useEffect(() => {
    if (!isActive || status !== 'loading') return;
    // A stalled image may never emit onError. Only the visible photo owns a wait timer.
    const timer = setTimeout(() => setStatus('timeout'), PHOTO_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isActive, status, attempt]);
  return (
    <View
      style={{ width, height }}
      aria-hidden={!isActive}
      accessibilityElementsHidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
    >
      <Image
        key={attempt}
        source={uri}
        style={StyleSheet.absoluteFill}
        contentPosition="center"
        contentFit="cover"
        cachePolicy={attempt ? 'none' : 'memory-disk'}
        accessible={isActive && status === 'loaded'}
        aria-hidden={!isActive || status !== 'loaded'}
        accessibilityLabel={label}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status !== 'loaded' && (
        <View
          aria-busy={status === 'loading'}
          style={[galleryStyles.placeholder, StyleSheet.absoluteFill, { paddingBottom: bottomInset }]}
        >
          {status === 'loading' && (
            <View accessible={false} aria-hidden style={galleryStyles.skeleton}>
              <View style={galleryStyles.skeletonBlock} />
              <View style={galleryStyles.skeletonLine} />
            </View>
          )}
          {status !== 'loading' && <Icon name="image-outline" size={24} color={x.day.link} />}
          <Txt accessibilityLiveRegion={isActive ? 'polite' : 'none'} style={galleryStyles.placeholderText}>
            {status === 'timeout'
              ? hotelText.photoTimeout
              : status === 'error'
                ? hotelText.imageUnavailable
                : hotelText.photoLoading}
          </Txt>
          {(status === 'error' || status === 'timeout') && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStatus('loading');
                setAttempt((current) => current + 1);
              }}
              style={({ pressed }) => [galleryStyles.retry, pressed && galleryStyles.dim]}
            >
              <Txt style={galleryStyles.retryText}>{hotelText.retryPhoto}</Txt>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  skeleton: { width: '48%', gap: spacing.sm, alignItems: 'center' },
  skeletonBlock: { width: '100%', height: 24, backgroundColor: x.day.line, borderRadius: radius.sm },
  skeletonLine: { width: '60%', height: 8, backgroundColor: x.day.line, borderRadius: radius.sm },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: x.day.tintExplore,
    padding: spacing.lg,
  },
  placeholderText: { fontSize: 14, lineHeight: 23, color: x.day.text, textAlign: 'center' },
  pager: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  control: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.overlayHeavy,
  },
  counter: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.overlayHeavy,
  },
  counterText: { color: x.brand.white, fontSize: 13, lineHeight: 22, fontFamily: nativeFonts.semibold },
  retry: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: x.day.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 14, lineHeight: 23, color: x.day.link, fontFamily: nativeFonts.semibold },
  dim: { opacity: 0.6 },
});

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
      accessibilityState={{ disabled: !isEnabled }}
      onPress={() => selectQty(next)}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: x.day.surface,
      }}
    >
      <Txt style={{ color: isEnabled ? x.day.link : x.day.textSecondary, fontSize: 18, lineHeight: 26 }}>
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
          accessibilityState={{ disabled: isDisabled }}
          onPress={() => selectQty(1)}
          style={{
            alignItems: 'center',
            paddingVertical: 12,
            minHeight: 48,
            borderRadius: radius.sm,
            backgroundColor: isDisabled ? x.day.canvas : x.day.text,
          }}
        >
          <Txt
            style={{
              color: isDisabled ? x.day.textSecondary : x.day.surface,
              fontSize: 15,
              lineHeight: 24,
              fontFamily: nativeFonts.semibold,
            }}
          >
            {hotelText.pickRate}
          </Txt>
        </Pressable>
      ) : (
        <Row
          style={{
            gap: spacing.sm,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 4,
            borderRadius: radius.sm,
            backgroundColor: x.day.canvas,
          }}
        >
          {pillButton('−', !isDisabled, qty - 1)}
          <Txt style={{ color: x.day.text, fontSize: 14, lineHeight: 23, fontFamily: nativeFonts.semibold }}>
            {qty} {text.cartRooms}
          </Txt>
          {pillButton('+', !isDisabled && qty < booking.maxQty, qty + 1)}
        </Row>
      )}
      {notice !== '' && <Notice tone="error">{notice}</Notice>}
    </View>
  );
}

function CheckLine({ children, tone = x.day.text }: { children: string; tone?: string }) {
  return (
    <Row style={{ gap: 6, alignItems: 'flex-start' }}>
      <Icon name="checkmark" size={15} color={tone === x.day.text ? x.day.link : tone} />
      <Txt style={{ flex: 1, color: tone, fontSize: 14, lineHeight: 23 }}>{children}</Txt>
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
        borderRadius: radius.sm,
        backgroundColor: isSelected ? x.day.tintExplore : x.day.canvas,
      }}
    >
      <Row style={{ alignItems: 'flex-start', gap: spacing.sm }}>
        <Txt style={{ flex: 1, fontSize: 16, lineHeight: 25, fontFamily: nativeFonts.semibold }}>
          {rate.name}
        </Txt>
        {isSelected && <Icon name="checkmark-circle" size={22} color={x.day.link} />}
      </Row>
      <View style={{ gap: 6 }}>
        <CheckLine tone={rate.isRefundable ? x.day.link : x.day.textSecondary}>{policy}</CheckLine>
        {rate.perks.map((perk) => (
          <CheckLine key={perk}>{perk}</CheckLine>
        ))}
      </View>
      {/* Giá một hàng riêng: bên trái % giảm + giá gạch, bên phải giá mỗi đêm. */}
      <Row
        style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing.md }}
      >
        <View style={{ gap: 2 }}>
          {hasSaving && (
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 6,
                borderRadius: radius.sm,
                backgroundColor: x.action.primary,
              }}
            >
              <Txt variant="small" style={{ color: x.action.onPrimary, fontWeight: '700' }}>
                -{rate.discountPct}%
              </Txt>
            </View>
          )}
          {rate.listPricePerNight !== null && perNight !== null && rate.listPricePerNight > perNight && (
            <Txt variant="small" style={{ color: x.day.textSecondary, textDecorationLine: 'line-through' }}>
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
            <Txt
              style={{ fontSize: 20, lineHeight: 30, fontFamily: nativeFonts.semibold, color: x.day.text }}
            >
              {money(perNight)}
            </Txt>
            <Txt variant="small" style={ui.muted}>
              {hotelText.perNight}
            </Txt>
          </View>
        )}
      </Row>
      <Txt style={roomStyles.secondary}>{t('hotel.stayNights', { count: nights })}</Txt>
      {stayTotal !== null && !fitsParty && (
        <Txt variant="small" style={ui.muted}>
          {hotelText.cannotFitParty}
        </Txt>
      )}
      {discount > 0 && (
        <Txt variant="small" style={{ color: x.day.link }}>
          {text.cartChildSurcharge} {money(discount)}
        </Txt>
      )}
      {room.isAvailable && pricePerRoom !== null && (
        <View>
          {onPick ? (
            <Button style={{ minHeight: 48 }} disabled={isDisabled} onPress={() => onPick(rate.code)}>
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

const AMENITY_PREVIEW = 3;

function Fact({ icon, children }: { icon: Parameters<typeof Icon>[0]['name']; children: string }) {
  return (
    <Row style={{ gap: 4, alignItems: 'center' }}>
      <Icon name={icon} size={15} color={x.day.textSecondary} />
      <Txt style={roomStyles.secondary}>{children}</Txt>
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
  const [isRatesOpen, setRatesOpen] = useState(false);
  const selection = useBookingSelection();
  const firstRate = room.ratePlans.find((rate) => rate.totalPrice !== null) ?? room.ratePlans[0];
  const selectedRates = room.ratePlans.filter(
    (rate) =>
      rate.code === pickedRatePlanCode ||
      selection.items.some((item) => item.productId === room.productId && item.ratePlanCode === rate.code),
  );
  const shownRates = isRatesOpen
    ? room.ratePlans
    : selectedRates.length
      ? selectedRates
      : firstRate
        ? [firstRate]
        : [];
  const hiddenRates = room.ratePlans.length - shownRates.length;
  const amenities = isAmenityOpen ? room.amenities : room.amenities.slice(0, AMENITY_PREVIEW);
  const hiddenAmenities = room.amenities.length - AMENITY_PREVIEW;
  return (
    <View
      style={{
        borderRadius: radius.md,
        backgroundColor: x.day.surface,
        overflow: 'hidden',
      }}
    >
      <PhotoGallery images={room.images} name={room.name} ratio={16 / 10} rounded={0} />
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <Txt style={roomStyles.title}>{room.name}</Txt>
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
                <Row key={amenity} style={{ gap: spacing.sm, alignItems: 'flex-start', width: '100%' }}>
                  <Icon name="checkmark-circle-outline" size={15} color={x.day.link} />
                  <Txt style={[roomStyles.secondary, { flex: 1 }]}>{amenity}</Txt>
                </Row>
              ))}
            </Row>
            {hiddenAmenities > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isAmenityOpen }}
                onPress={() => setAmenityOpen((open) => !open)}
                style={roomStyles.toggle}
              >
                <Txt style={roomStyles.toggleText}>
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
              backgroundColor: x.day.tintWarm,
            }}
          >
            <Txt variant="small" style={{ color: x.day.text, fontWeight: '600' }}>
              {t('hotel.roomsLeft', { count: room.remaining })}
            </Txt>
          </View>
        )}
        {!room.isAvailable && (
          <Notice tone="warning">{room.reason ? text.reasons[room.reason] : text.unavailable}</Notice>
        )}
        {shownRates.map((rate) => (
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
        {(hiddenRates > 0 || (isRatesOpen && room.ratePlans.length > 1)) && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isRatesOpen }}
            onPress={() => setRatesOpen((open) => !open)}
            style={roomStyles.toggle}
          >
            <Txt style={roomStyles.toggleText}>
              {isRatesOpen ? hotelText.collapseRatePlans : t('hotel.moreRatePlans', { count: hiddenRates })}
            </Txt>
            <Icon name={isRatesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={x.day.link} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const roomStyles = StyleSheet.create({
  title: { fontSize: 18, lineHeight: 28, fontFamily: nativeFonts.semibold, color: x.day.text },
  secondary: { fontSize: 14, lineHeight: 23, color: x.day.textSecondary },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: x.day.canvas,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: 14,
    lineHeight: 23,
    color: x.day.link,
    fontFamily: nativeFonts.semibold,
    flexShrink: 1,
  },
});
