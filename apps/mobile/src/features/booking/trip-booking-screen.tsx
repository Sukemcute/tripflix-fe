import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import {
  applyTripPlanChoices,
  buildTripPlanCheckout,
  getBookableTripPlan,
  getTripDayDate,
  getTripNights,
  getTripPlanCategory,
  listTripPlanOffers,
  resolveTripPlanOffer,
  getTripPlanTotal,
  isAssistantPlanId,
  isValidTripPlanPassengers,
  readSoldOutConflict,
  type TripPlanOffer,
} from '@tripflix/app-core';
import {
  commerceApi,
  createCheckoutOperation,
  getFutureDate,
  HttpError,
  MAX_FLIGHT_SEATS,
  useApiSession,
  useFlightRoutes,
} from '@tripflix/api-client';
import { flightsControllerSearch } from '@tripflix/api-client/core-api/flights/flights';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { DateSingleField } from '@/components/date-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { assets, Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { DragSortList } from '@/features/post/drag-sort-list';
import { ActivityCard, TimeTag, type ActivityFields } from './activity-card';
import { CartLink } from './cart-ui';
import { CommerceError } from './commerce-state';
import { AskTripiCard } from './booking-home';
import { SaveItineraryButton } from '@/features/itinerary/save-itinerary-button';
import { SavedItinerariesSection } from '@/features/itinerary/saved-itinerary-screens';
import { TripBuilderEntry } from './trip-builder-screen';

const soldOutOf = (error: unknown) =>
  error instanceof HttpError && error.status === 409 ? readSoldOutConflict(error.body) : null;
import { ChoiceChip, ProductCard, formatDay, styles } from './trip-plan-parts';
import {
  saveTripBooking,
  useTripBooking,
  useTripPicks,
  useTripHotels,
  type SelectedTripBooking,
} from './trip-booking-store';

const copy = vi.mobile.tripPlan;

function SelectedTripScreen({ selected }: { selected: SelectedTripBooking }) {
  const { postId, postTitle, authorName, trip } = selected;
  const { isReady, user } = useApiSession();
  const routes = useFlightRoutes();
  const [isEditing, setEditing] = useState(false);
  const [startDate, setStartDate] = useState(() => getFutureDate(14));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [homeAirport, setHomeAirport] = useState<string>();
  const swappedHotels = useTripHotels(postId);
  const [openChooser, setOpenChooser] = useState<'origin' | null>(null);
  const items = trip.items ?? [];
  const days = Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1);
  // Gợi ý của người đăng (ăn uống, vui chơi…) thành thẻ khách tự sửa, kéo, thêm, bỏ như Tự lên lộ trình.
  // Chỉ đổi trong lộ trình của khách, bài đăng giữ nguyên; không đặt chỗ nên không vào đơn.
  const [suggestions, setSuggestions] = useState<(ActivityFields & { day: number })[]>(() =>
    items
      .filter((item) => !item.transport && !item.hotel)
      .map((item, index) => ({
        key: `s${index}`,
        day: item.day,
        time: item.time ?? '',
        title: item.title,
        category: getTripPlanCategory(item),
        detail: [item.location, item.notes].filter(Boolean).join(' · ') || undefined,
      })),
  );
  const [openSuggestion, setOpenSuggestion] = useState<string | null>(null);
  const [isDragging, setDragging] = useState(false);
  const suggestionsOf = (day: number) => suggestions.filter((item) => item.day === day);
  const updateSuggestion = (key: string, patch: Partial<ActivityFields>) =>
    setSuggestions((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const addSuggestion = (day: number) => {
    const key = `new${Date.now().toString(36)}`;
    setSuggestions((current) => [...current, { key, day, time: '', title: '', category: 'other' }]);
    setOpenSuggestion(key);
  };
  // Kéo trong một ngày: gợi ý của ngày đổi chỗ cho nhau, ngày khác giữ nguyên.
  const moveSuggestion = (day: number, from: number, to: number) =>
    setSuggestions((current) => {
      const dayItems = current.filter((item) => item.day === day);
      const [moved] = dayItems.splice(from, 1);
      if (!moved) return current;
      dayItems.splice(to, 0, moved);
      let index = 0;
      return current.map((item) => (item.day === day ? dayItems[index++]! : item));
    });
  const nights = getTripNights(days);
  const basePlan = getBookableTripPlan(trip);
  const plan = basePlan && applyTripPlanChoices(basePlan, { homeAirport, hotels: swappedHotels });
  const isDateValid = startDate >= getFutureDate(0);
  const checkIn = isDateValid ? startDate : '';
  const checkOut = isDateValid ? getTripDayDate(startDate, nights + 1) : '';
  const destination = basePlan?.flights[0]?.to;
  const origins = destination
    ? (routes.data ?? [])
        .filter((route) => route.destinations.some((d) => d.code === destination))
        .map((r) => r.airport)
    : [];

  const passengers = { adults, children, infants };
  const isPassengerValid = isValidTripPlanPassengers(passengers, MAX_FLIGHT_SEATS);
  // Gắn lựa chọn với bộ lọc để không dùng nhầm giá của ngày hoặc nhóm khách cũ.
  const selectionKey = JSON.stringify([postId, plan, checkIn, checkOut, passengers]);
  const [selection, setSelection] = useState<{
    key: string;
    excluded: string[];
  }>({ key: '', excluded: [] });
  if (selection.key !== selectionKey) {
    setSelection({ key: selectionKey, excluded: [] });
  }
  const current = selection.key === selectionKey ? selection : { key: selectionKey, excluded: [] };
  const toggle = (id: string) =>
    setSelection({
      ...current,
      excluded: current.excluded.includes(id)
        ? current.excluded.filter((value) => value !== id)
        : [...current.excluded, id],
    });
  const picks = useTripPicks();
  const choose = <T extends TripPlanOffer>(
    id: string,
    offers: T[],
    preferred?: { productId?: string; ratePlanCode?: string },
  ): T | null => resolveTripPlanOffer(offers, picks, selectionKey, id, preferred);
  const flightQueries = useQueries({
    queries: (plan?.flights ?? []).map((leg) => {
      const date = isDateValid ? getTripDayDate(startDate, leg.day) : '';
      return {
        queryKey: ['commerce', 'trip-plan-flight', leg.from, leg.to, date, adults, children, infants],
        enabled: isReady && isDateValid && isPassengerValid,
        staleTime: 0,
        retry: false,
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const { data } = await flightsControllerSearch(
            { from: leg.from, to: leg.to, date, passengers: adults, children, infants },
            { signal },
          );
          return listTripPlanOffers(data.flights.map((flight) => ({ ...flight, plans: flight.fares }))).map(
            (offer) => {
              const flight = data.flights.find((candidate) => candidate.productId === offer.productId)!;
              const fare = flight.fares.find((candidate) => candidate.code === offer.ratePlanCode)!;
              return {
                ...offer,
                date,
                flightNumber: flight.flightNumber,
                departTime: flight.departTime,
                cabinName: flight.cabinName,
                fareName: fare.name,
              };
            },
          );
        },
      };
    }),
  });
  // Mỗi chặng ở báo giá riêng theo ngày nhận và trả phòng của chặng đó (TF105: một chuyến nhiều khách sạn).
  const stays = (plan?.hotels ?? []).map((stay) => ({
    ...stay,
    checkIn: isDateValid ? getTripDayDate(startDate, stay.day) : '',
    checkOut: isDateValid ? getTripDayDate(startDate, stay.day + stay.nights) : '',
  }));
  const hotelQueries = useQueries({
    queries: stays.map((stay) => ({
      queryKey: ['commerce', 'trip-plan-hotel', stay.hotelId, stay.checkIn, stay.checkOut, adults],
      enabled: isReady && isDateValid && isPassengerValid,
      staleTime: 0,
      retry: false,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { checkIn: stayIn, checkOut: stayOut } = stay;
        const detail = await commerceApi.getHotel(
          stay.hotelId,
          { checkIn: stayIn, checkOut: stayOut, adults },
          signal,
        );
        const offers = listTripPlanOffers(
          detail.rooms.map((room) => ({ ...room, plans: room.ratePlans })),
        ).map((offer) => {
          const room = detail.rooms.find((candidate) => candidate.productId === offer.productId)!;
          const rate = room.ratePlans.find((candidate) => candidate.code === offer.ratePlanCode)!;
          return { ...offer, checkIn: stayIn, checkOut: stayOut, roomName: room.name, rateName: rate.name };
        });
        return { hotelName: detail.name, city: detail.city ?? detail.province.name, offers };
      },
    })),
  });
  const flightQuotes = flightQueries.map((query, index) =>
    !query.isFetching && !query.isError ? choose('f' + index, query.data ?? []) : null,
  );
  // Loại phòng người đăng chọn khi soạn lộ trình (TF105); hết phòng thì về phòng rẻ nhất.
  const stayRooms = stays.map((stay, index) => {
    const query = hotelQueries[index]!;
    return !query.isFetching && !query.isError
      ? choose(stay.id, query.data?.offers ?? [], {
          productId: stay.productId,
          ratePlanCode: stay.ratePlanCode,
        })
      : null;
  });
  const selectedFlights = flightQuotes.flatMap((flight, index) =>
    flight && !current.excluded.includes('f' + index) ? [flight] : [],
  );
  const selectedRooms = stayRooms.flatMap((room, index) =>
    room && !current.excluded.includes(stays[index]!.id) ? [room] : [],
  );
  const isChecking = [...flightQueries, ...hotelQueries].some((query) => query.isFetching);
  const canBook =
    isReady &&
    isDateValid &&
    isPassengerValid &&
    !isChecking &&
    selectedFlights.length + selectedRooms.length > 0;
  const total = getTripPlanTotal([
    ...flightQuotes.map((offer, index) => ({ offer, isSelected: !current.excluded.includes('f' + index) })),
    ...stayRooms.map((offer, index) => ({ offer, isSelected: !current.excluded.includes(stays[index]!.id) })),
  ]);
  const quoteStatus = !isDateValid ? copy.invalidDate : isChecking ? copy.checking : '';

  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () => {
      if (!canBook) throw new Error('Trip plan quote is unavailable');
      return createCheckout(
        buildTripPlanCheckout({
          adults,
          children,
          infants,
          // Lộ trình Tripi lập không phải bài đăng nên không ghi làm nguồn đơn.
          sourcePostId: isAssistantPlanId(postId) ? undefined : postId,
          flights: selectedFlights,
          rooms: selectedRooms,
        }),
      );
    },
    onSuccess: ({ orderId }) => {
      router.push({ pathname: '/checkout', params: { id: orderId } });
    },
    // Hết chỗ lúc giữ: xem lại giá và chỗ để khách thấy ngay món nào đã hết.
    onError: (error) => {
      if (!soldOutOf(error)) return;
      for (const query of [...flightQueries, ...hotelQueries]) void query.refetch();
    },
  });
  const soldOutProductId = soldOutOf(booking.error)?.productId;
  const book = () => {
    if (!canBook || booking.isPending) return;
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)/book' } });
      return;
    }
    booking.mutate();
  };
  const hotelCard = (index: number) => {
    const stay = stays[index]!;
    const query = hotelQueries[index]!;
    const room = stayRooms[index] ?? null;
    const hotelName = stay.hotelName ?? query.data?.hotelName ?? trip.hotelName ?? copy.stayTitle;
    const canChange = !booking.isPending && isDateValid && isPassengerValid;
    return (
      <ProductCard
        key={stay.id}
        tone="hotel"
        icon="bed"
        title={hotelName}
        detail={[t('mobile.tripPlan.hotelTitle', { nights: stay.nights }), room?.roomName, room?.rateName]
          .filter(Boolean)
          .join(' · ')}
        price={query.isFetching ? '…' : room ? money(room.totalPrice) : undefined}
        status={
          query.isError
            ? copy.quoteFailed
            : (query.isSuccess && !room) || (!!room && room.productId === soldOutProductId)
              ? copy.soldOutItem
              : undefined
        }
        isSelected={!!room && !current.excluded.includes(stay.id)}
        isDisabled={!room || booking.isPending}
        onToggle={() => toggle(stay.id)}
        onExpand={
          canChange
            ? () =>
                router.push({
                  pathname: '/hotel-rooms',
                  params: {
                    id: stay.hotelId,
                    checkIn: stay.checkIn,
                    checkOut: stay.checkOut,
                    adults: String(adults),
                    children: String(children),
                    infants: String(infants),
                    pick: 'trip',
                    pickId: stay.id,
                    pickKey: selectionKey,
                    productId: room?.productId,
                    ratePlanCode: room?.ratePlanCode,
                  },
                })
            : undefined
        }
        actionLabel={copy.changeHotel}
        onAction={
          canChange
            ? () =>
                router.push({
                  pathname: '/search',
                  params: {
                    pick: 'trip',
                    pickId: 'hotelProperty:' + stay.id,
                    pickKey: postId,
                    q: trip.destinationName || query.data?.city || hotelName,
                    checkIn: stay.checkIn,
                    checkOut: stay.checkOut,
                    adults: String(adults),
                  },
                })
            : undefined
        }
      />
    );
  };

  return (
    <Screen
      title={copy.bookingTitle}
      back={false}
      header={null}
      compact
      background={x.day.canvas}
      scroll={false}
      padded={false}
      footer={
        <View style={selected.fromFeatured ? { gap: spacing.sm } : styles.totalRow}>
          <View style={{ flex: 1 }}>
            <Txt style={styles.muted}>
              {t('mobile.tripPlan.pickedCount', {
                picked: selectedFlights.length + selectedRooms.length,
                total: (plan?.flights.length ?? 0) + stays.length,
              }) +
                ' · ' +
                t('mobile.tripPlan.passengerSummary', passengers)}
            </Txt>
            <Txt style={styles.total}>{money(total)}</Txt>
            {adults + children > 0 && total > 0 && (
              <Txt style={styles.muted}>
                {t('mobile.tripPlan.perGuest', { amount: money(Math.round(total / (adults + children))) })}
              </Txt>
            )}
          </View>
          {selected.fromFeatured ? (
            <Row style={{ gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <SaveItineraryButton request={() => ({ source: 'reel', postId })} />
              <Button compact icon="flash" disabled={!canBook || booking.isPending} onPress={book}>
                {booking.isPending ? copy.booking : copy.bookNow}
              </Button>
            </Row>
          ) : (
            <Button compact icon="flash" disabled={!canBook || booking.isPending} onPress={book}>
              {booking.isPending ? copy.booking : copy.bookNow}
            </Button>
          )}
        </View>
      }
    >
      <ScrollView
        scrollEnabled={!isDragging}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[ui.content, ui.pad]}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={layout.cover}>
            {/* Ảnh bìa người đăng tự chọn; không có thì linh vật Tripi (poster video hay có chữ in sẵn). */}
            {selected.trip.posterUrl ? (
              <Image source={selected.trip.posterUrl} contentFit="cover" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, layout.coverMascot]}>
                {/* Nền giống khung nổi bật của tab Khám phá. */}
                <Image source={assets.vietnam} contentFit="cover" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, layout.coverShade]} />
                <Image source={assets.welcome} contentFit="contain" style={layout.coverMascotImage} />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.changeTrip}
              disabled={booking.isPending}
              onPress={() => {
                // Bỏ lộ trình đang đặt để lần sau vào tab Đặt thấy trang đầu; mở từ trang khác thì về trang đó.
                saveTripBooking(null);
                if (selected.origin && selected.origin !== '/book') router.navigate(selected.origin as Href);
              }}
              style={({ pressed }) => [layout.coverBack, pressed && styles.pressed]}
            >
              <Icon name="arrow-back" size={20} color={x.brand.white} />
            </Pressable>
          </View>
          <View style={layout.coverText}>
            <Txt style={layout.coverTitle} numberOfLines={2}>
              {postTitle}
            </Txt>
            <Txt style={layout.coverMeta} numberOfLines={1}>
              {[
                trip.destinationName,
                t('mobile.tripPlan.daysNights', { days, nights }),
                t('mobile.tripPlan.bookingBy', { name: authorName }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          </View>
          {plan && (
            <View style={[styles.bookPanel, layout.panel]}>
              <Row style={layout.pills}>
                {[
                  {
                    icon: 'calendar-outline' as const,
                    label: formatDay(startDate) + ' · ' + t('mobile.tripPlan.daysNights', { days, nights }),
                  },
                  {
                    icon: 'people-outline' as const,
                    label: t('mobile.tripPlan.passengerSummary', passengers),
                  },
                ].map((pill) => (
                  <Pressable
                    key={pill.icon}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isEditing, disabled: booking.isPending }}
                    disabled={booking.isPending}
                    onPress={() => setEditing((value) => !value)}
                    style={({ pressed }) => [
                      layout.pill,
                      isEditing && layout.pillActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon name={pill.icon} size={16} color={x.day.link} />
                    <Txt style={layout.pillText}>{pill.label}</Txt>
                  </Pressable>
                ))}
              </Row>
              {isEditing && (
                <>
                  <View style={styles.filters}>
                    <View style={styles.date}>
                      <DateSingleField
                        label={copy.startDate}
                        value={startDate}
                        min={getFutureDate(0)}
                        isDisabled={booking.isPending}
                        onChange={setStartDate}
                      />
                    </View>
                  </View>
                  <View style={styles.passengers}>
                    {[
                      {
                        value: adults,
                        label: copy.adults,
                        add: copy.addAdult,
                        remove: copy.removeAdult,
                        onChange: (value: number) => {
                          setAdults(value);
                          setInfants((count) => Math.min(count, value));
                        },
                        canRemove: adults > 1,
                        canAdd: adults + children < MAX_FLIGHT_SEATS,
                      },
                      {
                        value: children,
                        label: copy.children,
                        add: copy.addChild,
                        remove: copy.removeChild,
                        onChange: setChildren,
                        canRemove: children > 0,
                        canAdd: adults + children < MAX_FLIGHT_SEATS,
                      },
                      {
                        value: infants,
                        label: copy.infants,
                        add: copy.addInfant,
                        remove: copy.removeInfant,
                        onChange: setInfants,
                        canRemove: infants > 0,
                        canAdd: infants < adults,
                      },
                    ].map((stepper) => (
                      <View key={stepper.label} style={styles.passenger}>
                        <Txt style={styles.muted}>{stepper.label}</Txt>
                        <View style={styles.stepper}>
                          <IconButton
                            name="remove"
                            size={mobileIconSize.control}
                            label={stepper.remove}
                            disabled={booking.isPending || !stepper.canRemove}
                            onPress={() => stepper.onChange(stepper.value - 1)}
                          />
                          <Txt style={styles.label}>{stepper.value}</Txt>
                          <IconButton
                            name="add"
                            size={mobileIconSize.control}
                            label={stepper.add}
                            disabled={booking.isPending || !stepper.canAdd}
                            onPress={() => stepper.onChange(stepper.value + 1)}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {!!quoteStatus && (
                <Txt style={styles.status} accessibilityLiveRegion="polite">
                  {quoteStatus}
                </Txt>
              )}
              <CommerceError error={booking.error} />
            </View>
          )}

          <View style={styles.timeline}>
            {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
              const flightLegs = (plan?.flights ?? [])
                .map((leg, legIndex) => ({ leg, legIndex }))
                .filter(({ leg }) => leg.day === day);
              const dayItems = items.filter((item) => item.day === day);
              const selfArranged = dayItems.filter(
                ({ transport }) =>
                  transport &&
                  (transport.mode !== 'flight' ||
                    !(basePlan?.flights ?? []).some(
                      (leg) =>
                        leg.day === day &&
                        leg.from === transport.fromAirport &&
                        leg.to === transport.toAirport,
                    )),
              );
              const flightRows = flightLegs.map(({ leg, legIndex }) => {
                const flight = flightQuotes[legIndex];
                const query = flightQueries[legIndex]!;
                const id = 'f' + legIndex;
                const isOutbound = legIndex === 0;
                const original = basePlan?.flights[legIndex] ?? leg;
                const point = dayItems.find(
                  ({ transport }) =>
                    transport?.mode === 'flight' &&
                    transport.fromAirport === original.from &&
                    transport.toAirport === original.to,
                );
                return {
                  key: id,
                  time: flight?.departTime?.slice(0, 5) ?? point?.time ?? '',
                  content: (
                    <ProductCard
                      key={`f${legIndex}`}
                      tone="flight"
                      icon="airplane"
                      title={`${leg.from} → ${leg.to}`}
                      detail={
                        flight
                          ? [
                              formatDay(flight.date),
                              flight.flightNumber,
                              flight.departTime?.slice(0, 5),
                              flight.cabinName,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : copy.flightTitle
                      }
                      price={query.isFetching ? '…' : flight ? money(flight.totalPrice) : undefined}
                      status={
                        query.isError
                          ? copy.quoteFailed
                          : (query.isSuccess && !flight) ||
                              (!!flight && flight.productId === soldOutProductId)
                            ? copy.soldOutItem
                            : undefined
                      }
                      isSelected={!!flight && !current.excluded.includes(id)}
                      isDisabled={!flight || booking.isPending}
                      onToggle={() => toggle(id)}
                      onExpand={
                        booking.isPending || !isDateValid || !isPassengerValid
                          ? undefined
                          : () =>
                              router.push({
                                pathname: '/flights',
                                params: {
                                  from: leg.from,
                                  to: leg.to,
                                  date: getTripDayDate(startDate, leg.day),
                                  passengers: String(adults),
                                  children: String(children),
                                  infants: String(infants),
                                  pick: 'trip',
                                  pickId: id,
                                  pickKey: selectionKey,
                                  productId: flight?.productId,
                                  ratePlanCode: flight?.ratePlanCode,
                                },
                              })
                      }
                      actionLabel={isOutbound && origins.length > 1 ? copy.changeOrigin : undefined}
                      isActionOpen={isOutbound && openChooser === 'origin'}
                      onAction={
                        booking.isPending
                          ? undefined
                          : () => setOpenChooser((open) => (open === 'origin' ? null : 'origin'))
                      }
                    >
                      <View style={styles.chooser}>
                        <Txt style={styles.muted}>{copy.departFrom}</Txt>
                        <View style={styles.choices}>
                          {origins.map((code) => (
                            <ChoiceChip
                              key={code}
                              label={code}
                              isDisabled={booking.isPending}
                              isSelected={code === (homeAirport ?? basePlan?.flights[0]?.from)}
                              onPress={() => {
                                setHomeAirport(code === basePlan?.flights[0]?.from ? undefined : code);
                                setOpenChooser(null);
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    </ProductCard>
                  ),
                };
              });
              const fixedRows = [
                ...flightRows,
                ...stays.flatMap((stay, index) => {
                  if (stay.day !== day) return [];
                  const original = basePlan?.hotels[index] ?? stay;
                  const point = dayItems.find(({ hotel }) => hotel?.hotelId === original.hotelId);
                  return [{ key: stay.id, time: point?.time ?? '14:00', content: hotelCard(index) }];
                }),
                ...selfArranged.map((item, index) => ({
                  key: `self${index}`,
                  time: item.time ?? '',
                  content: (
                    <View style={styles.stop}>
                      <Icon name="bus-outline" size={14} color={x.day.textSecondary} />
                      <Txt style={styles.muted}>
                        {[item.time, item.title, copy.selfArranged].filter(Boolean).join(' · ')}
                      </Txt>
                    </View>
                  ),
                })),
              ].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
              const activities = suggestionsOf(day);
              const rows: (
                | { key: string; kind: 'fixed'; content: ReactNode }
                | { key: string; kind: 'activity'; item: (typeof activities)[number] }
              )[] = activities.map((item) => ({ key: item.key, kind: 'activity', item }));
              for (const row of fixedRows) {
                const before = rows.findIndex(
                  (entry) =>
                    entry.kind === 'activity' && (entry.item.time || '99:99') >= (row.time || '99:99'),
                );
                rows.splice(before === -1 ? rows.length : before, 0, { ...row, kind: 'fixed' });
              }
              return (
                <View key={day} style={styles.day}>
                  {day < days && <View style={styles.rail} />}
                  <View style={styles.dayDot}>
                    <Txt style={styles.dayDotText}>{day}</Txt>
                  </View>
                  <View style={styles.dayContent}>
                    <Txt style={styles.dayLabel}>
                      {isDateValid
                        ? t('mobile.tripPlan.dayDate', {
                            day,
                            date: formatDay(getTripDayDate(startDate, day)),
                          })
                        : t('mobile.tripPlan.day', { day })}
                    </Txt>
                    <View style={styles.community}>
                      <Txt style={styles.communityLabel}>{copy.community}</Txt>
                      <DragSortList
                        items={rows}
                        onMove={(from, to) => {
                          if (rows[from]?.kind !== 'activity') return;
                          const activityIndex = (index: number) =>
                            rows.slice(0, index).filter((row) => row.kind === 'activity').length;
                          const target =
                            activityIndex(to) - (to > from && rows[to]?.kind === 'fixed' ? 1 : 0);
                          moveSuggestion(day, activityIndex(from), Math.max(0, target));
                        }}
                        onDragChange={setDragging}
                        renderItem={(row, _index, handle) => {
                          if (row.kind === 'fixed') return row.content;
                          const { item } = row;
                          return (
                            <Row key={item.key} style={localStyles.timedRow}>
                              <TimeTag time={item.time} onAdd={() => setOpenSuggestion(item.key)} />
                              <View style={ui.flex}>
                                <ActivityCard
                                  item={item}
                                  handle={handle}
                                  isOpen={openSuggestion === item.key}
                                  onToggle={() =>
                                    setOpenSuggestion(openSuggestion === item.key ? null : item.key)
                                  }
                                  onChange={(patch) => updateSuggestion(item.key, patch)}
                                  onRemove={() =>
                                    setSuggestions((current) =>
                                      current.filter((other) => other.key !== item.key),
                                    )
                                  }
                                />
                              </View>
                            </Row>
                          );
                        }}
                      />
                      <Button tone="text" icon="add" onPress={() => addSuggestion(day)}>
                        {copy.addSuggestion}
                      </Button>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Mỗi bài được chọn dựng lại trang để bỏ giá, bộ lọc và vị trí cuộn của bài trước. */
export function TripBookingScreen() {
  const selected = useTripBooking();
  // Lộ trình nổi bật chỉ nằm ở tab Khám phá.
  if (selected) return <SelectedTripScreen key={selected.postId} selected={selected} />;
  return (
    <Screen title={copy.bookingTitle} back={false} header={<BookingHeader />}>
      <View style={{ gap: spacing.xl }}>
        <AskTripiCard />
        <View style={{ gap: spacing.sm }}>
          <Txt variant="title">{copy.planNewTitle}</Txt>
          <TripBuilderEntry />
        </View>
        <SavedItinerariesSection />
      </View>
    </Screen>
  );
}

/** Đầu trang tab Đặt: tiêu đề lớn và lối vào giỏ, thay cho logo để chừa chỗ cho nội dung. */
function BookingHeader() {
  return (
    <Row style={layout.header}>
      <Txt variant="title">{copy.bookingTitle}</Txt>
      <CartLink />
    </Row>
  );
}

const layout = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  // Ảnh bìa tràn hết bề ngang, giữ phần trên của poster (chữ trên ảnh bìa thường nằm ở đó).
  cover: {
    height: 220,
    marginHorizontal: -mobileLayout.gutter,
    marginTop: -spacing.md,
    overflow: 'hidden',
    backgroundColor: x.day.canvas,
  },
  coverMascot: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  coverShade: { backgroundColor: colors.overlay },
  coverMascotImage: { width: '70%', height: '92%' },
  coverBack: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayHeavy,
  },
  coverText: { gap: 2, paddingTop: spacing.xs },
  coverTitle: { ...compactType.title, fontFamily: nativeFonts.bold, color: x.day.text },
  coverMeta: { ...compactType.body, fontFamily: nativeFonts.regular, color: x.day.textSecondary },
  panel: { backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
  pills: { gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  pillActive: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  pillText: { ...compactType.body, fontFamily: nativeFonts.medium, color: x.day.text },
});

const localStyles = StyleSheet.create({
  timedRow: { alignItems: 'flex-start', gap: spacing.sm },
});
