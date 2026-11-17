import { useMutation } from '@tanstack/react-query';
import { buildTripPlanCheckout, getTripDayDate, readSoldOutConflict } from '@tripflix/app-core';
import { createCheckoutOperation, getFutureDate, HttpError, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DateSingleField } from '@/components/date-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { clearPostHotelPick, usePostHotelPick } from '@/features/post/post-hotel-pick-store';
import { DestinationPicker } from '@/features/post/trip-plan-editor';
import { CommerceError } from './commerce-state';
import { useTripPicks } from './trip-booking-store';
import { ProductCard } from './trip-plan-parts';

const copy = vi.mobile.tripBuilder;
const MAX_ADULTS = 9;
/** Khoá chung với màn đặt vé máy bay ở chế độ chọn; mỗi chuyến bay một pickId riêng. */
const FLIGHT_PICK_KEY = 'trip-builder';
/** Khoá thẻ khách sạn có tiền tố riêng để không lẫn với trình soạn lộ trình lúc đăng bài (cùng kho chọn khách sạn). */
const HOTEL_KEY_PREFIX = 'builder:';

interface HotelItem {
  kind: 'hotel';
  key: string;
  checkIn: string;
  nights: number;
  hotelName: string;
  productId: string;
  ratePlanCode: string;
  roomName: string;
  rateName: string;
  totalPrice: number;
}

interface FlightItem {
  kind: 'flight';
  key: string;
  date: string;
  from: string;
  to: string;
  productId: string;
  ratePlanCode: string;
  flightNumber: string | null;
  departTime: string | null;
  fareName: string;
  totalPrice: number;
}

type TripItem = HotelItem | FlightItem;
type HotelDraft = { key: string; checkIn: string; nights: number };

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}${Date.now().toString(36)}-${(keySeq += 1)}`;

/**
 * Tự lên lộ trình ở tab Đặt (TF105): thêm, bớt khách sạn và chuyến bay tuỳ ý. Mỗi món chọn ở màn thật của app
 * (tìm khách sạn → chọn phòng, đặt vé máy bay ở chế độ chọn) rồi quay về thành một thẻ; giữ chỗ tất cả trong một đơn.
 */
export function TripBuilderScreen() {
  const { user } = useApiSession();
  const [destination, setDestination] = useState({ destinationName: '', destinationPlaceId: '' });
  const [adults, setAdults] = useState(2);
  const [items, setItems] = useState<TripItem[]>([]);
  // Khách sạn sắp thêm hoặc đang đổi: chọn ngày nhận và số đêm trước khi sang màn tìm khách sạn.
  const [hotelDraft, setHotelDraft] = useState<HotelDraft | null>(null);
  const [pendingFlightKey, setPendingFlightKey] = useState<string | null>(null);

  // Loại phòng chọn xong ở màn chọn phòng: thêm hoặc thay thẻ đúng khoá.
  const hotelPick = usePostHotelPick();
  useEffect(() => {
    if (!hotelPick?.key.startsWith(HOTEL_KEY_PREFIX) || !hotelPick.productId || hotelPick.totalPrice == null)
      return;
    if (hotelDraft?.key !== hotelPick.key) return;
    const card: HotelItem = {
      kind: 'hotel',
      key: hotelPick.key,
      checkIn: hotelDraft.checkIn,
      nights: hotelDraft.nights,
      hotelName: hotelPick.hotelName,
      productId: hotelPick.productId,
      ratePlanCode: hotelPick.ratePlanCode ?? '',
      roomName: hotelPick.roomName ?? '',
      rateName: hotelPick.rateName ?? '',
      totalPrice: hotelPick.totalPrice,
    };
    setItems((current) => [...current.filter((item) => item.key !== card.key), card]);
    setHotelDraft(null);
    clearPostHotelPick();
  }, [hotelPick, hotelDraft]);

  // Chuyến bay chọn xong ở màn đặt vé nằm trong picks theo pickId.
  const picks = useTripPicks();
  useEffect(() => {
    if (!pendingFlightKey || picks.key !== FLIGHT_PICK_KEY) return;
    const offer = picks.values[pendingFlightKey];
    if (!offer?.date || !offer.from || !offer.to) return;
    const card: FlightItem = {
      kind: 'flight',
      key: pendingFlightKey,
      date: offer.date,
      from: offer.from,
      to: offer.to,
      productId: offer.productId,
      ratePlanCode: offer.ratePlanCode,
      flightNumber: offer.flightNumber ?? null,
      departTime: offer.departTime ?? null,
      fareName: offer.fareName ?? '',
      totalPrice: offer.totalPrice,
    };
    setItems((current) => [...current.filter((item) => item.key !== card.key), card]);
    setPendingFlightKey(null);
  }, [picks, pendingFlightKey]);

  const sorted = [...items].sort((a, b) => itemDate(a).localeCompare(itemDate(b)));
  const lastHotel = sorted.filter((item): item is HotelItem => item.kind === 'hotel').at(-1);
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const searchHotel = (draft: HotelDraft) =>
    router.push({
      pathname: '/search',
      params: {
        pick: 'post',
        pickKey: draft.key,
        q: destination.destinationName,
        checkIn: draft.checkIn,
        checkOut: getTripDayDate(draft.checkIn, draft.nights + 1),
        adults: String(adults),
      },
    });
  const searchFlight = (item?: FlightItem) => {
    const key = item?.key ?? nextKey('flight:');
    setPendingFlightKey(key);
    router.push({
      pathname: '/flights',
      params: {
        pick: 'trip',
        pickMode: 'builder',
        pickKey: FLIGHT_PICK_KEY,
        pickId: key,
        passengers: String(adults),
        ...(item
          ? { from: item.from, to: item.to, date: item.date }
          : { date: sorted[0] ? itemDate(sorted[0]) : getFutureDate(14) }),
      },
    });
  };
  const remove = (key: string) => setItems((current) => current.filter((item) => item.key !== key));
  // Đổi số khách thì giá cũ không còn đúng: bỏ hết thẻ để chọn lại.
  const changeAdults = (value: number) => {
    setAdults(value);
    setItems([]);
  };

  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () =>
      createCheckout(
        buildTripPlanCheckout({
          adults,
          flights: items.flatMap((item) =>
            item.kind === 'flight'
              ? [{ productId: item.productId, ratePlanCode: item.ratePlanCode, date: item.date }]
              : [],
          ),
          rooms: items.flatMap((item) =>
            item.kind === 'hotel'
              ? [
                  {
                    productId: item.productId,
                    ratePlanCode: item.ratePlanCode,
                    checkIn: item.checkIn,
                    checkOut: getTripDayDate(item.checkIn, item.nights + 1),
                  },
                ]
              : [],
          ),
        }),
      ),
    onSuccess: ({ orderId }) => router.push({ pathname: '/checkout', params: { id: orderId } }),
  });
  const soldOutProductId =
    booking.error instanceof HttpError ? readSoldOutConflict(booking.error.body)?.productId : undefined;
  const book = () => {
    if (!items.length || booking.isPending) return;
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: '/trip-builder' } });
      return;
    }
    booking.mutate();
  };

  return (
    <Screen
      title={copy.title}
      background={colors.surface}
      footer={
        <View style={styles.footer}>
          <View style={ui.flex}>
            <Txt style={styles.muted}>{t('mobile.tripBuilder.pickedCount', { count: items.length })}</Txt>
            <Txt style={styles.total}>{money(total)}</Txt>
          </View>
          <Button compact icon="flash" disabled={!items.length || booking.isPending} onPress={book}>
            {booking.isPending ? copy.booking : copy.book}
          </Button>
        </View>
      }
    >
      <View style={styles.card}>
        <DestinationPicker
          name={destination.destinationName}
          placeId={destination.destinationPlaceId}
          onChange={setDestination}
        />
        <Stepper
          label={t('mobile.tripBuilder.adults', { count: adults })}
          value={adults}
          min={1}
          max={MAX_ADULTS}
          onChange={changeAdults}
        />
      </View>

      <Txt style={styles.heading}>{copy.itemsTitle}</Txt>
      {sorted.length === 0 && !hotelDraft && <Txt style={styles.muted}>{copy.emptyItems}</Txt>}
      {sorted.map((item) =>
        item.kind === 'hotel' ? (
          <ProductCard
            key={item.key}
            tone="hotel"
            icon="bed"
            title={item.hotelName}
            detail={[
              `${formatShortDate(item.checkIn)} → ${formatShortDate(getTripDayDate(item.checkIn, item.nights + 1))}`,
              t('mobile.tripBuilder.nights', { count: item.nights }),
              item.roomName,
              item.rateName,
            ]
              .filter(Boolean)
              .join(' · ')}
            price={money(item.totalPrice)}
            status={soldOutProductId === item.productId ? vi.mobile.tripPlan.soldOutItem : undefined}
            onExpand={() => setHotelDraft({ key: item.key, checkIn: item.checkIn, nights: item.nights })}
            actionLabel={copy.remove}
            onAction={() => remove(item.key)}
          />
        ) : (
          <ProductCard
            key={item.key}
            tone="flight"
            icon="airplane"
            title={`${item.from} → ${item.to}`}
            detail={[formatShortDate(item.date), item.flightNumber, item.departTime, item.fareName]
              .filter(Boolean)
              .join(' · ')}
            price={money(item.totalPrice)}
            status={soldOutProductId === item.productId ? vi.mobile.tripPlan.soldOutItem : undefined}
            onExpand={() => searchFlight(item)}
            actionLabel={copy.remove}
            onAction={() => remove(item.key)}
          />
        ),
      )}

      {hotelDraft && (
        <View style={styles.draft}>
          <Txt style={styles.draftTitle}>{copy.hotelDraftTitle}</Txt>
          <DateSingleField
            label={copy.checkIn}
            value={hotelDraft.checkIn}
            min={getFutureDate(0)}
            onChange={(checkIn) => setHotelDraft({ ...hotelDraft, checkIn })}
          />
          <Stepper
            label={t('mobile.tripBuilder.nights', { count: hotelDraft.nights })}
            value={hotelDraft.nights}
            min={1}
            max={30}
            onChange={(nights) => setHotelDraft({ ...hotelDraft, nights })}
          />
          <Row style={styles.draftActions}>
            <Button tone="text" onPress={() => setHotelDraft(null)}>
              {copy.cancel}
            </Button>
            <Button compact icon="search" onPress={() => searchHotel(hotelDraft)}>
              {copy.findHotel}
            </Button>
          </Row>
        </View>
      )}

      <Row style={styles.addRow}>
        <AddButton
          icon="bed"
          label={copy.addHotel}
          tone="hotel"
          isDisabled={!!hotelDraft}
          onPress={() =>
            setHotelDraft({
              key: nextKey(HOTEL_KEY_PREFIX),
              // Khách sạn mới nối tiếp khách sạn trước, không có thì từ ngày đi gợi ý.
              checkIn: lastHotel
                ? getTripDayDate(lastHotel.checkIn, lastHotel.nights + 1)
                : getFutureDate(14),
              nights: 2,
            })
          }
        />
        <AddButton icon="airplane" label={copy.addFlight} tone="flight" onPress={() => searchFlight()} />
      </Row>
      <CommerceError error={booking.error} />
    </Screen>
  );
}

/** Lối vào ở đầu tab Đặt, trên phần lộ trình nổi bật. */
export function TripBuilderEntry() {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/trip-builder' as Href)}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
    >
      <View style={styles.entryIcon}>
        <Icon name="map" size={22} color={colors.background} />
      </View>
      <View style={ui.flex}>
        <Txt style={styles.entryTitle}>{copy.entryTitle}</Txt>
        <Txt style={styles.muted}>{copy.entryBody}</Txt>
      </View>
      <Icon name="chevron-forward" size={mobileIconSize.control} color={colors.textMuted} />
    </Pressable>
  );
}

function itemDate(item: TripItem): string {
  return item.kind === 'hotel' ? item.checkIn : item.date;
}

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Row style={styles.stepperRow}>
      <Txt style={styles.stepperLabel}>{label}</Txt>
      <Row style={styles.stepper}>
        <IconButton
          name="remove"
          size={mobileIconSize.control}
          label={copy.less}
          disabled={value <= min}
          onPress={() => onChange(value - 1)}
        />
        <Txt style={styles.stepperValue}>{value}</Txt>
        <IconButton
          name="add"
          size={mobileIconSize.control}
          label={copy.more}
          disabled={value >= max}
          onPress={() => onChange(value + 1)}
        />
      </Row>
    </Row>
  );
}

function AddButton({
  icon,
  label,
  tone,
  onPress,
  isDisabled = false,
}: {
  icon: 'bed' | 'airplane';
  label: string;
  tone: 'hotel' | 'flight';
  onPress: () => void;
  isDisabled?: boolean;
}) {
  const ink = tone === 'hotel' ? colors.coralInk : colors.tealInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.add, { borderColor: ink }, (pressed || isDisabled) && styles.pressed]}
    >
      <Icon name={icon} size={18} color={ink} />
      <Txt style={[styles.addText, { color: ink }]}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  muted: { ...compactType.body, fontFamily: nativeFonts.regular, color: colors.textMuted },
  heading: { ...compactType.title, fontFamily: nativeFonts.bold, color: colors.ink },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepperRow: { alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { ...compactType.heading, fontFamily: nativeFonts.medium, color: colors.ink },
  stepper: { alignItems: 'center', gap: spacing.sm },
  stepperValue: {
    ...compactType.heading,
    fontFamily: nativeFonts.semibold,
    minWidth: 20,
    textAlign: 'center',
  },
  draft: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.coralInk,
    backgroundColor: colors.coralTint,
  },
  draftTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.coralInk },
  draftActions: { justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  addRow: { gap: spacing.sm },
  add: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
  },
  addText: { ...compactType.heading, fontFamily: nativeFonts.semibold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { ...compactType.title, fontFamily: nativeFonts.bold, color: colors.coralInk },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealInk,
  },
  entryTitle: { ...compactType.title, fontFamily: nativeFonts.bold, color: colors.ink },
});
