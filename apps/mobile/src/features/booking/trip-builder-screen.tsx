import { useMutation } from '@tanstack/react-query';
import {
  buildTripPlanCheckout,
  findPlaceAirport,
  getTripDayDate,
  planNextTripFlight,
  TRIP_PLAN_TIME_PATTERN,
  readSoldOutConflict,
  readTripBuilderSeed,
  TRIP_BUILDER_SEED_KEYS,
} from '@tripflix/app-core';
import {
  createCheckoutOperation,
  getFutureDate,
  HttpError,
  useApiSession,
  useFlightRoutes,
  type TripAddonRequest,
  type TripAddonStay,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { DateSingleField } from '@/components/date-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { DragSortList } from '@/features/post/drag-sort-list';
import { ActivityCard, TimeTag, type ActivityFields } from './activity-card';
import { clearPostHotelPick, savePostHotel, usePostHotelPick } from '@/features/post/post-hotel-pick-store';
import { DestinationPicker } from '@/features/post/trip-plan-editor';
import { CommerceError } from './commerce-state';
import { useTripPicks } from './trip-booking-store';
import { SaveItineraryButton } from '@/features/itinerary/save-itinerary-button';
import { NO_ADDON_PICKS, TripAddonsSection, type TripAddonPicks } from './trip-addons-section';
import { ChoiceChip, ProductCard, formatDay, styles as planStyles } from './trip-plan-parts';

const copy = vi.mobile.tripBuilder;
const MAX_ADULTS = 9;
/** Ghế máy bay tính người lớn và trẻ em, như màn đặt theo lộ trình. */
const MAX_SEATS = 9;
/** Khoá chung với màn đặt vé máy bay ở chế độ chọn; mỗi chuyến bay một pickId riêng. */
const FLIGHT_PICK_KEY = 'trip-builder';
/** Khoá thẻ khách sạn có tiền tố riêng để không lẫn với trình soạn lộ trình lúc đăng bài (cùng kho chọn khách sạn). */
const HOTEL_KEY_PREFIX = 'builder:';

interface HotelItem {
  kind: 'hotel';
  key: string;
  checkIn: string;
  nights: number;
  hotelId: string;
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

/** Hoạt động tự ghi (cà phê, ăn uống, vui chơi…): chỉ để lên lịch, không đặt chỗ, không tính tiền. */
interface ActivityItem extends ActivityFields {
  kind: 'activity';
  date: string;
}

type BookableItem = HotelItem | FlightItem;
type TripItem = BookableItem | ActivityItem;
/** Giờ nhận, trả phòng thông thường; khách sạn chưa trả giờ riêng nên thẻ dùng giờ này. */
const HOTEL_CHECK_IN_TIME = '14:00';
const HOTEL_CHECK_OUT_TIME = '12:00';
type HotelDraft = { key: string; checkIn: string; nights: number; hotelId?: string; hotelName?: string };
/** Chuyến bay sắp thêm: chiều đi tới nơi đến, hoặc chiều về từ nơi đến về nhà. */
type FlightDraft = { key: string; leg: 'outbound' | 'inbound'; from: string; to: string; date: string };

/**
 * Lộ trình đang soạn nằm ngoài màn hình: sang màn đăng nhập (bấm Giữ chỗ khi chưa đăng nhập) rồi quay lại,
 * màn được dựng lại mà các thẻ vẫn còn. Trên web lưu thêm vào sessionStorage để tải lại trang không mất.
 */
interface BuilderState {
  destination: { destinationName: string; destinationPlaceId: string };
  adults: number;
  children?: number;
  /** Số ngày khách tự thêm (kể cả ngày còn trống); ngày có thẻ luôn hiện dù số này nhỏ hơn. */
  dayCount?: number;
  /** Ngày đầu khi lộ trình chưa có thẻ nào. */
  startDate?: string;
  infants?: number;
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
  const params = useLocalSearchParams();
  const [seed] = useState(() => readTripBuilderSeed(params, getFutureDate(0)));
  const [initial] = useState(() => (seed ? { ...emptyBuilder(), ...seed } : readBuilder()));
  const [destination, setDestination] = useState(initial.destination);
  const [adults, setAdults] = useState(initial.adults);
  const [children, setChildren] = useState(initial.children ?? 0);
  const [infants, setInfants] = useState(initial.infants ?? 0);
  const [dayCount, setDayCount] = useState(initial.dayCount ?? 0);
  const [startDate, setStartDate] = useState(initial.startDate ?? getFutureDate(14));
  const [items, setItems] = useState<TripItem[]>(initial.items);
  useEffect(() => {
    writeBuilder({ destination, adults, children, infants, dayCount, startDate, items });
  }, [destination, adults, children, infants, dayCount, startDate, items]);
  useEffect(() => {
    // State đã nhận seed trước khi ghi đè bản lưu; bỏ params để quay về không áp dụng lại.
    if (seed) router.setParams(Object.fromEntries(TRIP_BUILDER_SEED_KEYS.map((key) => [key, undefined])));
  }, [seed]);
  // Khách sạn sắp thêm hoặc đang đổi: chọn ngày nhận và số đêm trước khi sang màn tìm khách sạn.
  const [hotelDraft, setHotelDraft] = useState<HotelDraft | null>(() =>
    seed?.hotel ? { key: nextKey(HOTEL_KEY_PREFIX), ...seed.hotel } : null,
  );
  const [pendingFlightKey, setPendingFlightKey] = useState<string | null>(null);
  const [flightDraft, setFlightDraft] = useState<FlightDraft | null>(() =>
    seed?.flight ? { key: nextKey('flight:'), leg: 'outbound', ...seed.flight } : null,
  );
  // Chuyến về Tripi gợi ý: mở bản nháp chiều về khi khách chọn xong chuyến đi.
  const [pendingReturn, setPendingReturn] = useState(seed?.returnFlight ?? null);
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
      hotelId: hotelPick.hotelId,
      hotelName: hotelPick.hotelName,
      productId: hotelPick.productId,
      ratePlanCode: hotelPick.ratePlanCode ?? '',
      roomName: hotelPick.roomName ?? '',
      rateName: hotelPick.rateName ?? '',
      totalPrice: hotelPick.totalPrice,
    };
    setItems((current) => placeByTime(current, card));
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
    setItems((current) => placeByTime(current, card));
    setPendingFlightKey(null);
    if (pendingReturn && offer.to === pendingReturn.from) {
      setFlightDraft({ key: nextKey('flight:'), leg: 'inbound', ...pendingReturn });
      setPendingReturn(null);
    }
  }, [picks, pendingFlightKey, pendingReturn]);

  const sorted = [...items].sort((a, b) => itemDate(a).localeCompare(itemDate(b)));
  const lastHotel = sorted.filter((item): item is HotelItem => item.kind === 'hotel').at(-1);
  const bookable = items.filter((item): item is BookableItem => item.kind !== 'activity');
  const total = bookable.reduce((sum, item) => sum + item.totalPrice, 0);
  const flights = sorted.filter((item): item is FlightItem => item.kind === 'flight');

  // TF105: lưu theo Ngày 1..N; server đổi ngày thật thành ngày thứ mấy và bỏ giá.
  const saveRequest = () =>
    items.length
      ? {
          source: 'builder' as const,
          builder: {
            destinationName: destination.destinationName || undefined,
            destinationPlaceId: destination.destinationPlaceId || undefined,
            startDate,
            dayCount,
            items: items.map((item) =>
              item.kind === 'activity'
                ? {
                    kind: item.kind,
                    date: item.date,
                    title: item.title,
                    category: item.category,
                    ...(item.time && { time: item.time }),
                    ...(item.detail && { detail: item.detail }),
                  }
                : item,
            ),
          },
        }
      : null;
  const [addonFrom, setAddonFrom] = useState<string | null>(null);
  const addonRequest: TripAddonRequest | null = bookable.length
    ? {
        // Thẻ lưu từ bản cũ (chưa có hotelId) thì bỏ qua, tránh gửi mục thiếu mã.
        items: sorted
          .filter(
            (item): item is BookableItem =>
              item.kind === 'flight' || (item.kind === 'hotel' && !!item.hotelId),
          )
          .map((item) =>
            item.kind === 'hotel'
              ? {
                  type: 'hotel' as const,
                  hotelId: item.hotelId,
                  checkIn: item.checkIn,
                  checkOut: getTripDayDate(item.checkIn, item.nights + 1),
                }
              : { type: 'flight' as const, fromAirport: item.from, toAirport: item.to, date: item.date },
          ),
        adults,
        ...(addonFrom ? { fromAirport: addonFrom } : {}),
      }
    : null;
  // Thẻ đổi thì gợi ý cũ không còn hợp: bỏ vé đã chọn từ gợi ý.
  const addonKey = JSON.stringify(addonRequest);
  const [addonPicks, setAddonPicks] = useState<{ key: string; picks: TripAddonPicks }>({
    key: addonKey,
    picks: NO_ADDON_PICKS,
  });
  const addonSelection = addonPicks.key === addonKey ? addonPicks.picks : NO_ADDON_PICKS;
  const pickedFlights = [addonSelection.outbound, addonSelection.inbound].flatMap((flight) =>
    flight ? [flight] : [],
  );
  const addonTotal = pickedFlights.reduce((sum, flight) => sum + flight.totalPrice, 0);
  // Khách sạn gợi ý chưa có loại phòng: mở màn chọn phòng, chọn xong quay về thành thẻ.
  const pickAddonStay = (stay: TripAddonStay, dates: { checkIn: string; checkOut: string }) => {
    const key = nextKey(HOTEL_KEY_PREFIX);
    const nights = Math.max(
      1,
      Math.round((Date.parse(dates.checkOut) - Date.parse(dates.checkIn)) / 86_400_000),
    );
    setHotelDraft({ key, checkIn: dates.checkIn, nights });
    savePostHotel(key, { hotelId: stay.hotelId, hotelName: stay.name });
    router.push({
      pathname: '/hotel-rooms',
      params: {
        id: stay.hotelId,
        pick: 'post',
        pickKey: key,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        adults: String(adults),
      },
    });
  };

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
  const searchHotel = (draft: HotelDraft) => {
    if (draft.hotelId) {
      savePostHotel(draft.key, { hotelId: draft.hotelId, hotelName: draft.hotelName ?? '' });
      router.push({
        pathname: '/hotel-rooms',
        params: {
          id: draft.hotelId,
          pick: 'post',
          pickKey: draft.key,
          checkIn: draft.checkIn,
          checkOut: getTripDayDate(draft.checkIn, draft.nights + 1),
          adults: String(adults),
        },
      });
      return;
    }
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
  };
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
        children: String(children),
        infants: String(infants),
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
  const changeGuests = (next: { adults?: number; children?: number; infants?: number }) => {
    const nextAdults = next.adults ?? adults;
    setAdults(nextAdults);
    setChildren(next.children ?? children);
    // Mỗi em bé ngồi lòng một người lớn.
    setInfants(Math.min(next.infants ?? infants, nextAdults));
    setItems([]);
  };
  const guests = { adults, children, infants };
  const grandTotal = total + addonTotal;
  // Chia thẻ theo ngày tính từ món sớm nhất, như lộ trình đặt theo bài đăng.
  const firstDate = sorted[0] ? itemDate(sorted[0]) : startDate;
  const dayOf = (date: string) => Math.round((Date.parse(date) - Date.parse(firstDate)) / 86_400_000) + 1;
  const checkOuts = sorted.flatMap((item) =>
    item.kind === 'hotel'
      ? [{ key: item.key, name: item.hotelName, date: getTripDayDate(item.checkIn, item.nights + 1) }]
      : [],
  );
  // Hiện liền mạch từ ngày 1 tới ngày cuối có thẻ hoặc ngày khách tự thêm, kể cả ngày trống ở giữa.
  const lastItemDay = Math.max(
    0,
    ...sorted.map((item) => dayOf(itemDate(item))),
    ...checkOuts.map((out) => dayOf(out.date)),
  );
  const days = Array.from({ length: Math.max(lastItemDay, dayCount) }, (_, index) => index + 1);
  const addDay = () => setDayCount(days.length + 1);
  // Chỉ bỏ được ngày cuối khi nó trống và không phải ngày có thẻ.
  const canRemoveLastDay = days.length > lastItemDay;
  const removeLastDay = () => setDayCount(Math.max(lastItemDay, days.length - 1));

  // Hoạt động: thêm vào cuối ngày rồi mở ngay để ghi tên, giờ.
  const [openActivityKey, setOpenActivityKey] = useState<string | null>(null);
  const [isDragging, setDragging] = useState(false);
  const addActivity = (date: string) => {
    const activity: ActivityItem = {
      kind: 'activity',
      key: nextKey('activity:'),
      date,
      time: '',
      title: '',
      category: 'other',
    };
    setItems((current) => placeByTime(current, activity));
    setOpenActivityKey(activity.key);
  };
  const updateActivity = (key: string, patch: Partial<ActivityItem>) =>
    setItems((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.kind !== 'activity') return current;
      const next = { ...target, ...patch };
      // Gõ xong giờ hợp lệ thì thẻ tự về đúng chỗ theo giờ; sau đó vẫn kéo đổi chỗ được.
      if (patch.time !== undefined && TRIP_PLAN_TIME_PATTERN.test(patch.time))
        return placeByTime(current, next);
      return current.map((item) => (item.key === key ? next : item));
    });
  // Kéo trong một ngày: các thẻ của ngày đổi chỗ cho nhau, ngày khác giữ nguyên.
  const moveInDay = (dayItems: readonly TripItem[], from: number, to: number) =>
    setItems((current) => {
      const next = [...dayItems];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      const keys = new Set(dayItems.map((item) => item.key));
      let index = 0;
      return current.map((item) => (keys.has(item.key) ? next[index++]! : item));
    });
  const itemsOfDay = (day: number) => sorted.filter((item) => dayOf(itemDate(item)) === day);

  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () =>
      createCheckout(
        buildTripPlanCheckout({
          adults,
          children,
          infants,
          flights: [
            ...items.flatMap((item) =>
              item.kind === 'flight'
                ? [{ productId: item.productId, ratePlanCode: item.ratePlanCode, date: item.date }]
                : [],
            ),
            ...pickedFlights.map((flight) => ({
              productId: flight.productId,
              ratePlanCode: flight.ratePlanCode,
              date: flight.date,
            })),
          ],
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
    if (!bookable.length || booking.isPending) return;
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: '/trip-builder' } });
      return;
    }
    booking.mutate();
  };

  const renderCard = (item: TripItem, handle: (child: ReactNode) => ReactNode) =>
    item.kind === 'activity' ? (
      <ActivityCard
        item={item}
        handle={handle}
        isOpen={openActivityKey === item.key}
        onToggle={() => setOpenActivityKey(openActivityKey === item.key ? null : item.key)}
        onChange={(patch) => updateActivity(item.key, patch)}
        onRemove={() => remove(item.key)}
      />
    ) : item.kind === 'hotel' ? (
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
    );
  const renderItem = (item: TripItem, handle: (child: ReactNode) => ReactNode) => (
    <Row key={item.key} style={styles.timedRow}>
      <TimeTag
        time={itemTime(item)}
        // Giờ của vé và phòng lấy theo giờ bay, giờ nhận phòng; hoạt động thì khách tự đặt.
        onAdd={item.kind === 'activity' ? () => setOpenActivityKey(item.key) : undefined}
      />
      <View style={ui.flex}>{renderCard(item, handle)}</View>
    </Row>
  );

  return (
    <Screen
      title={copy.title}
      background={colors.surface}
      scroll={false}
      padded={false}
      footer={
        <View style={styles.footer}>
          <View style={ui.flex}>
            <Txt style={styles.muted}>
              {t('mobile.tripBuilder.pickedCount', { count: bookable.length + pickedFlights.length }) +
                ' · ' +
                t('mobile.tripPlan.passengerSummary', guests)}
            </Txt>
            <Txt style={styles.total}>{money(grandTotal)}</Txt>
            {grandTotal > 0 && (
              <Txt style={styles.muted}>
                {t('mobile.tripPlan.perGuest', {
                  amount: money(Math.round(grandTotal / (adults + children))),
                })}
              </Txt>
            )}
          </View>
          <SaveItineraryButton request={saveRequest} />
          <Button compact icon="flash" disabled={!bookable.length || booking.isPending} onPress={book}>
            {booking.isPending ? copy.booking : copy.book}
          </Button>
        </View>
      }
    >
      {/* Cuộn riêng để khoá cuộn lúc đang kéo thẻ, như trình soạn lộ trình lúc đăng bài. */}
      <ScrollView
        scrollEnabled={!isDragging}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[ui.content, ui.pad]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <DestinationPicker
            name={destination.destinationName}
            placeId={destination.destinationPlaceId}
            onChange={setDestination}
          />
          <Stepper
            label={vi.mobile.tripPlan.adults}
            value={adults}
            min={1}
            max={Math.min(MAX_ADULTS, MAX_SEATS - children)}
            onChange={(value) => changeGuests({ adults: value })}
          />
          <Stepper
            label={vi.mobile.tripPlan.children}
            value={children}
            min={0}
            max={MAX_SEATS - adults}
            onChange={(value) => changeGuests({ children: value })}
          />
          <Stepper
            label={vi.mobile.tripPlan.infants}
            value={infants}
            min={0}
            max={adults}
            onChange={(value) => changeGuests({ infants: value })}
          />
        </View>

        <Txt style={styles.heading}>{copy.itemsTitle}</Txt>
        {sorted.length === 0 && !hotelDraft && days.length === 0 && (
          <Txt style={styles.muted}>{copy.emptyItems}</Txt>
        )}
        {/* Chưa có thẻ nào thì ngày 1 do khách chọn; có thẻ rồi thì ngày 1 là ngày của thẻ sớm nhất. */}
        {sorted.length === 0 && days.length > 0 && (
          <DateSingleField
            label={copy.startDate}
            value={startDate}
            min={getFutureDate(0)}
            onChange={setStartDate}
          />
        )}
        <View style={planStyles.timeline}>
          {days.map((day, dayIndex) => (
            <View key={day} style={planStyles.day}>
              {dayIndex < days.length - 1 && <View style={planStyles.rail} />}
              <View style={planStyles.dayDot} />
              <View style={planStyles.dayContent}>
                <Row style={styles.dayHead}>
                  <Txt style={[planStyles.dayLabel, ui.flex]}>
                    {t('mobile.tripPlan.dayDate', { day, date: formatDay(getTripDayDate(firstDate, day)) })}
                  </Txt>
                  {day === days.length && canRemoveLastDay && (
                    <IconButton
                      name="trash-outline"
                      label={t('mobile.tripPlan.editor.removeDay', { day })}
                      onPress={removeLastDay}
                    />
                  )}
                </Row>
                {/* Trả phòng (12:00) đứng đầu ngày: thường trước các chặng buổi chiều. */}
                {checkOuts
                  .filter((out) => dayOf(out.date) === day)
                  .map((out) => (
                    <Row key={out.key} style={styles.timedRow}>
                      <TimeTag time={HOTEL_CHECK_OUT_TIME} />
                      <Row style={[ui.flex, styles.checkOut]}>
                        <Icon name="log-out-outline" size={16} color={colors.textMuted} />
                        <Txt style={styles.muted}>
                          {t('mobile.tripBuilder.checkOut', { hotel: out.name })}
                        </Txt>
                      </Row>
                    </Row>
                  ))}
                <DragSortList
                  items={itemsOfDay(day)}
                  onMove={(from, to) => moveInDay(itemsOfDay(day), from, to)}
                  onDragChange={setDragging}
                  renderItem={(item, _index, handle) => renderItem(item, handle)}
                />
                <View style={styles.dayAdd}>
                  <Button tone="text" icon="add" onPress={() => addActivity(getTripDayDate(firstDate, day))}>
                    {copy.addActivityToDay}
                  </Button>
                </View>
              </View>
            </View>
          ))}
        </View>
        <Button tone="text" icon="calendar-outline" onPress={addDay}>
          {t('mobile.tripBuilder.addDay', { day: days.length + 1 })}
        </Button>

        {hotelDraft && (
          <View style={styles.draft}>
            <Txt style={styles.draftTitle}>{hotelDraft.hotelName || copy.hotelDraftTitle}</Txt>
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
                  .filter(
                    (code, index, all) => !!code && code !== placeAirport && all.indexOf(code) === index,
                  )
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
            <Row style={styles.draftActions}>
              <Button tone="text" onPress={() => setFlightDraft(null)}>
                {copy.cancel}
              </Button>
              <Button compact icon="search" onPress={() => searchFlight(flightDraft)}>
                {copy.findFlight}
              </Button>
            </Row>
          </View>
        )}

        {!hotelDraft && !flightDraft && (
          <TripAddonsSection
            request={addonRequest}
            picks={addonSelection}
            onChangePicks={(next) => setAddonPicks({ key: addonKey, picks: next })}
            onChangeFrom={setAddonFrom}
            onPickStay={pickAddonStay}
          />
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
        <AddButton
          icon="cafe-outline"
          label={copy.addActivity}
          tone="activity"
          // Hoạt động thêm từ nút dưới cùng rơi vào ngày cuối của lộ trình.
          onPress={() => addActivity(getTripDayDate(firstDate, Math.max(days.length, 1)))}
        />
        <CommerceError error={booking.error} />
      </ScrollView>
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

function itemTime(item: TripItem): string {
  if (item.kind === 'hotel') return HOTEL_CHECK_IN_TIME;
  if (item.kind === 'flight') return item.departTime ?? '';
  return item.time;
}

/**
 * Đặt thẻ vào đúng ngày, trong ngày đứng trước thẻ đầu tiên có giờ muộn hơn (vé, phòng tự có giờ).
 * Thẻ không có giờ (hoạt động mới) xuống cuối ngày. Thẻ đã có (đổi phòng, đổi vé) được đặt lại theo giờ mới.
 */
function placeByTime(items: readonly TripItem[], card: TripItem): TripItem[] {
  const rest = items.filter((item) => item.key !== card.key);
  const date = itemDate(card);
  const time = itemTime(card);
  const hasTime = TRIP_PLAN_TIME_PATTERN.test(time);
  const index = rest.findIndex((item) => {
    const other = itemDate(item);
    if (other !== date) return other > date;
    const otherTime = itemTime(item);
    return hasTime && TRIP_PLAN_TIME_PATTERN.test(otherTime) && otherTime > time;
  });
  return index < 0 ? [...rest, card] : [...rest.slice(0, index), card, ...rest.slice(index)];
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
  icon: 'bed' | 'airplane' | 'cafe-outline';
  label: string;
  tone: 'hotel' | 'flight' | 'activity';
  onPress: () => void;
  isDisabled?: boolean;
}) {
  const ink = tone === 'hotel' ? colors.coralInk : tone === 'flight' ? colors.tealInk : colors.ink;
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
  draftActions: { justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  addRow: { gap: spacing.sm },
  checkOut: { alignItems: 'center', gap: spacing.xs, minHeight: 28 },
  dayHead: { alignItems: 'center', gap: spacing.xs },
  dayAdd: { alignItems: 'flex-start', paddingLeft: 48 },
  timedRow: { alignItems: 'flex-start', gap: spacing.sm },
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
