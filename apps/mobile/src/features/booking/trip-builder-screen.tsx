import { useMutation } from '@tanstack/react-query';
import {
  buildTripPlanCheckout,
  findPlaceAirport,
  getTripDayDate,
  planNextTripFlight,
  readSoldOutConflict,
} from '@tripflix/app-core';
import {
  createCheckoutOperation,
  getFutureDate,
  HttpError,
  useApiSession,
  useFlightRoutes,
  useTripFlightSuggestions,
  useTripStaySuggestions,
  type TripFlightSuggestion,
  type TripStaySuggestion,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DateSingleField } from '@/components/date-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { clearPostHotelPick, usePostHotelPick } from '@/features/post/post-hotel-pick-store';
import { DestinationPicker } from '@/features/post/trip-plan-editor';
import { CommerceError } from './commerce-state';
import { useTripPicks } from './trip-booking-store';
import { ChoiceChip, ProductCard, TripBookingAction } from './trip-plan-parts';

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
/** Chuyến bay sắp thêm: chiều đi tới nơi đến, hoặc chiều về từ nơi đến về nhà. */
type FlightDraft = { key: string; leg: 'outbound' | 'inbound'; from: string; to: string; date: string };
/** Số gợi ý hiện trong mỗi khung; muốn xem thêm thì sang màn tìm đầy đủ. */
const SUGGESTION_LIMIT = 3;

/**
 * Lộ trình đang soạn nằm ngoài màn hình: sang màn đăng nhập (bấm Giữ chỗ khi chưa đăng nhập) rồi quay lại,
 * màn được dựng lại mà các thẻ vẫn còn. Trên web lưu thêm vào sessionStorage để tải lại trang không mất.
 */
interface BuilderState {
  destination: { destinationName: string; destinationPlaceId: string };
  adults: number;
  items: TripItem[];
}
const BUILDER_STORAGE_KEY = 'tripflix.tripBuilder.v1';
const emptyBuilder = (): BuilderState => ({
  destination: { destinationName: '', destinationPlaceId: '' },
  adults: 2,
  items: [],
});
let savedBuilder: BuilderState | null = null;
function readBuilder(): BuilderState {
  if (savedBuilder) return savedBuilder;
  try {
    const raw = globalThis.sessionStorage?.getItem(BUILDER_STORAGE_KEY);
    if (raw) savedBuilder = JSON.parse(raw) as BuilderState;
  } catch {
    // Không đọc được (máy chặn lưu trữ) thì bắt đầu trống.
  }
  return savedBuilder ?? emptyBuilder();
}
function writeBuilder(state: BuilderState | null) {
  savedBuilder = state;
  try {
    if (state) globalThis.sessionStorage?.setItem(BUILDER_STORAGE_KEY, JSON.stringify(state));
    else globalThis.sessionStorage?.removeItem(BUILDER_STORAGE_KEY);
  } catch {
    // Chỉ là tiện lợi: không lưu được thì vẫn giữ trong bộ nhớ.
  }
}

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}${Date.now().toString(36)}-${(keySeq += 1)}`;

/**
 * Tự lên lộ trình ở tab Đặt (TF105): thêm, bớt khách sạn và chuyến bay tuỳ ý. Mỗi món chọn ở màn thật của app
 * (tìm khách sạn → chọn phòng, đặt vé máy bay ở chế độ chọn) rồi quay về thành một thẻ; giữ chỗ tất cả trong một đơn.
 */
export function TripBuilderScreen() {
  const { user } = useApiSession();
  const [initial] = useState(readBuilder);
  const [destination, setDestination] = useState(initial.destination);
  const [adults, setAdults] = useState(initial.adults);
  const [items, setItems] = useState<TripItem[]>(initial.items);
  useEffect(() => {
    writeBuilder({ destination, adults, items });
  }, [destination, adults, items]);
  // Khách sạn sắp thêm hoặc đang đổi: chọn ngày nhận và số đêm trước khi sang màn tìm khách sạn.
  const [hotelDraft, setHotelDraft] = useState<HotelDraft | null>(null);
  const [pendingFlightKey, setPendingFlightKey] = useState<string | null>(null);
  const [flightDraft, setFlightDraft] = useState<FlightDraft | null>(null);
  const routes = useFlightRoutes();
  const place = destination.destinationPlaceId;
  // Nơi đến chọn trong danh sách (Hà Nội) thì chuyến bay đi tới, về từ sân bay ở đó (HAN).
  // Chưa chọn trong danh sách vẫn tìm sân bay theo tên gõ; gợi ý thì cần nơi chọn trong danh sách.
  const placeAirport = findPlaceAirport(routes.data ?? [], destination.destinationName);

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
  const flights = sorted.filter((item): item is FlightItem => item.kind === 'flight');

  // Gợi ý từ discovery (GET /api/trip-builder/*): chỗ Duy thay cách xếp, app hiện theo thứ tự trả về.
  const staySuggestions = useTripStaySuggestions(
    hotelDraft && place
      ? {
          place,
          checkIn: hotelDraft.checkIn,
          checkOut: getTripDayDate(hotelDraft.checkIn, hotelDraft.nights + 1),
          adults,
          sort: 'best_price',
          limit: SUGGESTION_LIMIT,
        }
      : null,
  );
  // Gợi ý vé tính theo sân bay nhà: chiều đi bay từ nhà, chiều về bay về nhà.
  const home = flightDraft ? (flightDraft.leg === 'outbound' ? flightDraft.from : flightDraft.to) : '';
  const flightSuggestions = useTripFlightSuggestions(
    flightDraft && place && placeAirport && home
      ? {
          place,
          from: home,
          departDate: flightDraft.date,
          ...(flightDraft.leg === 'inbound' ? { returnDate: flightDraft.date } : {}),
          adults,
          sort: 'cheapest',
          limit: SUGGESTION_LIMIT,
        }
      : null,
  );
  const flightOptions = flightDraft ? (flightSuggestions.data?.[flightDraft.leg] ?? []) : [];

  const startFlight = () =>
    setFlightDraft({
      key: nextKey('flight:'),
      ...planNextTripFlight({
        flights,
        hotels: sorted.filter((item): item is HotelItem => item.kind === 'hotel'),
        placeAirport,
        defaultHome: 'SGN',
        defaultDate: getFutureDate(14),
      }),
    });
  const addSuggestedFlight = (draft: FlightDraft, flight: TripFlightSuggestion) => {
    setItems((current) => [
      ...current,
      {
        kind: 'flight',
        key: draft.key,
        date: draft.date,
        from: flight.fromAirport,
        to: flight.toAirport,
        productId: flight.productId,
        ratePlanCode: flight.ratePlanCode,
        flightNumber: flight.name,
        departTime: flight.departTime,
        fareName: flight.airline ?? '',
        totalPrice: flight.totalPrice,
      },
    ]);
    setFlightDraft(null);
  };
  const addSuggestedStay = (draft: HotelDraft, stay: TripStaySuggestion) => {
    setItems((current) => [
      ...current.filter((item) => item.key !== draft.key),
      {
        kind: 'hotel',
        key: draft.key,
        checkIn: draft.checkIn,
        nights: draft.nights,
        hotelName: stay.name,
        productId: stay.roomProductId,
        ratePlanCode: stay.ratePlanCode,
        roomName: '',
        rateName: stay.reason?.text ?? '',
        totalPrice: stay.totalPrice,
      },
    ]);
    setHotelDraft(null);
  };

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
  const searchFlight = (item?: { key: string; from: string; to: string; date: string }) => {
    const key = item?.key ?? nextKey('flight:');
    setPendingFlightKey(key);
    setFlightDraft(null);
    router.push({
      pathname: '/flights',
      params: {
        pick: 'trip',
        pickMode: 'builder',
        pickKey: FLIGHT_PICK_KEY,
        pickId: key,
        passengers: String(adults),
        ...(item
          ? {
              ...(item.from ? { from: item.from } : {}),
              ...(item.to ? { to: item.to } : {}),
              date: item.date,
            }
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
    onSuccess: ({ orderId }) => {
      // Đã thành đơn: lần sau mở lại là lộ trình mới.
      writeBuilder(null);
      router.push({ pathname: '/checkout', params: { id: orderId } });
    },
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
          <TripBookingAction disabled={!items.length || booking.isPending} onPress={book}>
            {booking.isPending ? copy.booking : copy.book}
          </TripBookingAction>
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
          {!!place && (
            <Suggestions
              isLoading={staySuggestions.isFetching && !staySuggestions.data}
              isEmpty={(staySuggestions.data ?? []).length === 0}
            >
              {(staySuggestions.data ?? []).map((stay) => (
                <SuggestionRow
                  key={stay.hotelId}
                  tone="hotel"
                  title={stay.name}
                  detail={[
                    stay.stars ? `${stay.stars}★` : null,
                    stay.rating ? `${stay.rating.average}/5` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  reason={stay.reason?.text}
                  price={money(stay.totalPrice)}
                  onPress={() => addSuggestedStay(hotelDraft, stay)}
                />
              ))}
            </Suggestions>
          )}
          <Row style={styles.draftActions}>
            <Button tone="text" onPress={() => setHotelDraft(null)}>
              {copy.cancel}
            </Button>
            <Button compact icon="search" onPress={() => searchHotel(hotelDraft)}>
              {place ? copy.findOtherHotel : copy.findHotel}
            </Button>
          </Row>
        </View>
      )}

      {flightDraft && (
        <View style={[styles.draft, styles.flightDraft]}>
          <Txt style={[styles.draftTitle, { color: colors.tealInk }]}>
            {flightDraft.leg === 'outbound'
              ? t('mobile.tripBuilder.outboundTitle', { place: destination.destinationName || '…' })
              : t('mobile.tripBuilder.inboundTitle', { home: flightDraft.to })}
          </Txt>
          {flightDraft.leg === 'outbound' && (
            <Row style={styles.originRow}>
              <Txt style={styles.muted}>{copy.flyFrom}</Txt>
              {/* Sân bay đang chọn đứng đầu để luôn thấy. */}
              {[flightDraft.from, ...(routes.data ?? []).map((route) => route.airport)]
                .filter((code, index, all) => !!code && code !== placeAirport && all.indexOf(code) === index)
                .slice(0, 6)
                .map((code) => (
                  <ChoiceChip
                    key={code}
                    label={code}
                    isSelected={code === flightDraft.from}
                    onPress={() => setFlightDraft({ ...flightDraft, from: code })}
                  />
                ))}
            </Row>
          )}
          <Txt style={styles.legRoute}>{`${flightDraft.from || '…'} → ${flightDraft.to || '…'}`}</Txt>
          <DateSingleField
            label={copy.flightDate}
            value={flightDraft.date}
            min={getFutureDate(0)}
            onChange={(date) => setFlightDraft({ ...flightDraft, date })}
          />
          {!!place && !!placeAirport && (
            <Suggestions
              isLoading={flightSuggestions.isFetching && !flightSuggestions.data}
              isEmpty={flightOptions.length === 0}
            >
              {flightOptions.map((flight) => (
                <SuggestionRow
                  key={flight.flightId}
                  tone="flight"
                  title={`${flight.departTime ?? '--:--'} → ${flight.arriveTime ?? '--:--'} · ${flight.fromAirport} → ${flight.toAirport}`}
                  detail={flight.airline ?? ''}
                  reason={flight.reason?.text}
                  price={money(flight.totalPrice)}
                  onPress={() => addSuggestedFlight(flightDraft, flight)}
                />
              ))}
            </Suggestions>
          )}
          <Row style={styles.draftActions}>
            <Button tone="text" onPress={() => setFlightDraft(null)}>
              {copy.cancel}
            </Button>
            <Button compact icon="search" onPress={() => searchFlight(flightDraft)}>
              {copy.findOtherFlight}
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
        <AddButton
          icon="airplane"
          label={copy.addFlight}
          tone="flight"
          isDisabled={!!flightDraft}
          onPress={startFlight}
        />
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

function Suggestions({
  isLoading,
  isEmpty,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.suggestions}>
      <Txt style={styles.suggestionsTitle}>{copy.suggestionsTitle}</Txt>
      {isLoading ? (
        <Txt style={styles.muted}>{vi.api.loading}</Txt>
      ) : isEmpty ? (
        <Txt style={styles.muted}>{copy.noSuggestions}</Txt>
      ) : (
        children
      )}
    </View>
  );
}

function SuggestionRow({
  tone,
  title,
  detail,
  reason,
  price,
  onPress,
}: {
  tone: 'hotel' | 'flight';
  title: string;
  detail?: string;
  reason?: string;
  price: string;
  onPress: () => void;
}) {
  const ink = tone === 'hotel' ? colors.coralInk : colors.tealInk;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
    >
      <View style={ui.flex}>
        <Txt style={styles.suggestionTitle} numberOfLines={2}>
          {title}
        </Txt>
        {!!detail && <Txt style={styles.muted}>{detail}</Txt>}
        {!!reason && <Txt style={[styles.reason, { color: ink }]}>{reason}</Txt>}
      </View>
      <View style={styles.suggestionSide}>
        <Txt style={styles.suggestionPrice}>{price}</Txt>
        <Icon name="add-circle" size={22} color={ink} />
      </View>
    </Pressable>
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
  flightDraft: { borderColor: colors.tealInk, backgroundColor: colors.seaMist },
  originRow: { alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  legRoute: { ...compactType.title, fontFamily: nativeFonts.bold, color: colors.ink },
  suggestions: { gap: spacing.sm },
  suggestionsTitle: { ...compactType.label, fontFamily: nativeFonts.semibold, color: colors.textMuted },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  suggestionTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  reason: { ...compactType.label, fontFamily: nativeFonts.semibold },
  suggestionSide: { alignItems: 'flex-end', gap: 2 },
  suggestionPrice: { ...compactType.heading, fontFamily: nativeFonts.bold, color: colors.ink },
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
  footer: { gap: spacing.md },
  total: { fontSize: 24, lineHeight: 34, fontFamily: nativeFonts.bold, color: colors.navy },
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
