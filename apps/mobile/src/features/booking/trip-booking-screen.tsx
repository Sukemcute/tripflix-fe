import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import {
  applyTripPlanChoices,
  buildTripPlanCheckout,
  getBookableTripPlan,
  getTripDayDate,
  getTripNights,
  listTripPlanOffers,
  resolveTripPlanOffer,
  getTripPlanTotal,
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
  useReelsFeed,
} from '@tripflix/api-client';
import { flightsControllerSearch } from '@tripflix/api-client/core-api/flights/flights';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ApiErrorNotice } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { CartLink } from './cart-ui';
import { CommerceError } from './commerce-state';
import { TripBuilderEntry } from './trip-builder-screen';

const soldOutOf = (error: unknown) =>
  error instanceof HttpError && error.status === 409 ? readSoldOutConflict(error.body) : null;
import { ChoiceChip, ProductCard, TripBookingAction, formatDay, styles } from './trip-plan-parts';
import {
  saveTripBooking,
  useTripBooking,
  useTripPicks,
  useTripHotels,
  type SelectedTripBooking,
} from './trip-booking-store';
import { LoadingDots } from '@/components/loading-dots';

const copy = vi.mobile.tripPlan;

function SelectedTripScreen({
  selected,
  featured,
}: {
  selected: SelectedTripBooking;
  featured: (isDisabled: boolean) => ReactNode;
}) {
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
                policy: fare.isRefundable
                  ? t('flights.freeCancel', { count: fare.freeCancelDays })
                  : vi.hotel.nonRefundable,
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
          return {
            ...offer,
            checkIn: stayIn,
            checkOut: stayOut,
            roomName: room.name,
            rateName: rate.name,
            policy: rate.isRefundable
              ? t('hotel.freeCancel', { days: rate.freeCancelDays })
              : vi.hotel.nonRefundable,
          };
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
          sourcePostId: postId,
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
        detail={[
          t('mobile.tripPlan.hotelTitle', { nights: stay.nights }),
          room && `${formatDay(stay.checkIn)} → ${formatDay(stay.checkOut)}`,
          room?.roomName,
          room?.rateName,
        ]
          .filter(Boolean)
          .join(' · ')}
        price={query.isFetching ? '…' : room ? money(room.totalPrice) : undefined}
        policy={room?.policy}
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
      background={colors.surface}
      scroll={false}
      padded={false}
      footer={
        <View style={styles.totalRow}>
          <View style={{ flex: 1 }}>
            <Txt style={styles.muted}>
              {t('mobile.tripPlan.pickedCount', {
                picked: selectedFlights.length + selectedRooms.length,
                total: (plan?.flights.length ?? 0) + stays.length,
              }) +
                ' · ' +
                t('mobile.tripPlan.passengerSummary', passengers)}
            </Txt>
            <Txt accessibilityLabel={copy.comboTotal} style={styles.total}>
              {money(total)}
            </Txt>
            {adults + children > 0 && total > 0 && (
              <Txt style={styles.muted}>
                {t('mobile.tripPlan.perGuest', { amount: money(Math.round(total / (adults + children))) })}
              </Txt>
            )}
          </View>
          <TripBookingAction disabled={!canBook || booking.isPending} onPress={book}>
            {booking.isPending ? copy.booking : copy.bookNow}
          </TripBookingAction>
        </View>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[ui.content, ui.pad]}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={layout.cover}>
            {selected.coverUrl ? (
              <Image
                source={selected.coverUrl}
                contentFit="cover"
                contentPosition="top"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tealInk }]} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.changeTrip}
              disabled={booking.isPending}
              onPress={() => saveTripBooking(null)}
              style={({ pressed }) => [layout.coverBack, pressed && styles.pressed]}
            >
              <Icon name="arrow-back" size={20} color={colors.background} />
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
                    <Icon name={pill.icon} size={16} color={colors.tealInk} />
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
              const community = items.filter((item) => item.day === day && !item.transport && !item.hotel);
              const selfArranged =
                basePlan?.selfArranged.filter((leg) => leg.day === day) ??
                items
                  .filter((item) => item.day === day && !!item.transport)
                  .map((item) => ({ day, title: item.title, mode: item.transport!.mode }));
              return (
                <View key={day} style={[styles.day, layout.fullWidthDay]}>
                  <View style={styles.dayContent}>
                    <Txt style={styles.dayLabel}>
                      {isDateValid
                        ? t('mobile.tripPlan.dayDate', {
                            day,
                            date: formatDay(getTripDayDate(startDate, day)),
                          })
                        : t('mobile.tripPlan.day', { day })}
                    </Txt>
                    {flightLegs.map(({ leg, legIndex }) => {
                      const flight = flightQuotes[legIndex];
                      const query = flightQueries[legIndex]!;
                      const id = 'f' + legIndex;
                      const isOutbound = legIndex === 0;
                      return (
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
                                  flight.fareName !== flight.cabinName ? flight.fareName : undefined,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')
                              : copy.flightTitle
                          }
                          price={query.isFetching ? '…' : flight ? money(flight.totalPrice) : undefined}
                          policy={flight?.policy}
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
                      );
                    })}
                    {stays.map((stay, index) => (stay.day === day ? hotelCard(index) : null))}
                    {selfArranged.map((leg, index) => (
                      <View key={'self' + index} style={styles.stop}>
                        <Icon name="bus-outline" size={14} color={colors.textMuted} />
                        <Txt style={styles.muted}>
                          {[leg.title ?? copy.modes[leg.mode], copy.selfArranged].join(' · ')}
                        </Txt>
                      </View>
                    ))}
                    {community.length > 0 && (
                      <View style={styles.community}>
                        <Txt style={styles.communityLabel}>{copy.community}</Txt>
                        {community.map((item, index) => (
                          <View key={index} style={styles.stop}>
                            <Icon
                              name={item.transport ? 'bus-outline' : 'location-outline'}
                              size={14}
                              color={colors.textMuted}
                            />
                            <View style={styles.stopText}>
                              <Txt style={styles.description}>
                                {item.time ? `${item.time} · ${item.title}` : item.title}
                              </Txt>
                              {!!(item.location || item.notes) && (
                                <Txt style={styles.muted}>
                                  {[item.location, item.notes].filter(Boolean).join(' · ')}
                                </Txt>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        {featured(booking.isPending)}
      </ScrollView>
    </Screen>
  );
}

/** Mỗi bài được chọn dựng lại trang để bỏ giá, bộ lọc và vị trí cuộn của bài trước. */
export function TripBookingScreen() {
  const selected = useTripBooking();
  const feed = useReelsFeed();
  const [destination, setDestination] = useState<string | null>(null);
  // Ô tính bằng điểm ảnh theo bề ngang lưới đo được: trên điện thoại ô 48,5% kèm aspectRatio bị co về 0 nên lưới trắng.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = Math.floor((gridWidth - spacing.sm) / 2);
  const tileSize = gridWidth > 0 ? { width: tileWidth, height: Math.round((tileWidth * 4.2) / 3) } : null;
  const posts = [
    ...new Map(
      (feed.data?.pages.flatMap((page) => page.items) ?? []).map((post) => [post.postId, post]),
    ).values(),
  ].filter(
    (post) =>
      post.postId !== selected?.postId && post.tripAttachment && getBookableTripPlan(post.tripAttachment),
  );
  const destinations = [
    ...new Set(
      posts.map((post) => post.tripAttachment!.destinationName).filter((name): name is string => !!name),
    ),
  ];
  const shownPosts = destination
    ? posts.filter((post) => post.tripAttachment!.destinationName === destination)
    : posts;
  const featured = (isDisabled: boolean) => (
    <View style={{ gap: spacing.md }}>
      <TripBuilderEntry />
      <Txt variant="heading">{copy.featured}</Txt>
      {destinations.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={layout.filters}>
          {[null, ...destinations].map((name) => (
            <ChoiceChip
              key={name ?? 'all'}
              label={name ?? copy.allDestinations}
              isSelected={destination === name}
              onPress={() => setDestination(name)}
            />
          ))}
        </ScrollView>
      )}
      <ApiErrorNotice
        error={feed.error}
        retry={() => {
          void feed.refetch();
        }}
      />
      {feed.isPending && <LoadingDots />}
      {!feed.isPending && !feed.isError && posts.length === 0 && (
        <Txt style={styles.muted}>{copy.featuredEmpty}</Txt>
      )}
      <View style={layout.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {shownPosts.map((post) => {
          const trip = post.tripAttachment!;
          const plan = getBookableTripPlan(trip)!;
          const days = Math.max(trip.daysCount ?? 0, ...(trip.items ?? []).map((item) => item.day), 1);
          // Poster riêng của lộ trình (TF105) trước, không có thì ảnh bìa video.
          const poster =
            trip.posterUrl || post.video.posters.w540 || post.video.posters.w360 || post.video.posters.w720;
          return (
            <Pressable
              key={post.postId}
              accessibilityRole="button"
              accessibilityLabel={post.title}
              disabled={isDisabled}
              onPress={() =>
                saveTripBooking({
                  postId: post.postId,
                  postTitle: post.title,
                  authorName: post.author.name ?? copy.communityAuthor,
                  coverUrl: poster,
                  trip,
                })
              }
              style={({ pressed }) => [layout.reel, tileSize, pressed && styles.pressed]}
            >
              {poster ? (
                <Image source={poster} contentFit="cover" style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tealInk }]} />
              )}
              <View style={layout.reelBadge}>
                <Txt style={layout.reelBadgeText}>{t('mobile.tripPlan.dayCount', { days })}</Txt>
              </View>
              <View style={layout.reelText}>
                <Txt style={layout.reelTitle} numberOfLines={2}>
                  {post.title}
                </Txt>
                <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
                  {!!trip.destinationName && (
                    <Txt style={layout.reelMeta} numberOfLines={1}>
                      {trip.destinationName}
                    </Txt>
                  )}
                  {plan.flights.length > 0 && (
                    <Icon name="airplane-outline" size={13} color={colors.background} />
                  )}
                  {plan.hotels.length > 0 && <Icon name="bed-outline" size={13} color={colors.background} />}
                </Row>
              </View>
            </Pressable>
          );
        })}
      </View>
      {feed.hasNextPage && (
        <Button
          tone="text"
          disabled={isDisabled || feed.isFetchingNextPage}
          onPress={() => {
            void feed.fetchNextPage();
          }}
        >
          {copy.loadMore}
        </Button>
      )}
    </View>
  );
  if (selected) return <SelectedTripScreen key={selected.postId} selected={selected} featured={featured} />;
  return (
    <Screen
      title={copy.bookingTitle}
      back={false}
      header={<BookingHeader />}
      compact
      background={colors.surface}
    >
      {featured(false)}
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
  fullWidthDay: { flexDirection: 'column' },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  filters: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reel: {
    width: '48.5%',
    aspectRatio: 3 / 4.2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  reelBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
  },
  // Chữ dùng bộ cỡ và phông của app (compactType, nativeFonts) như các thẻ chuyến bay, khách sạn bên dưới.
  reelBadgeText: { ...compactType.label, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  reelText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 2,
    padding: spacing.sm,
    backgroundColor: colors.overlayHeavy,
  },
  reelTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.background },
  reelMeta: { ...compactType.label, fontFamily: nativeFonts.medium, color: colors.background, flexShrink: 1 },
  // Ảnh bìa tràn hết bề ngang, giữ phần trên của poster (chữ trên ảnh bìa thường nằm ở đó).
  cover: {
    height: 220,
    marginHorizontal: -mobileLayout.gutter,
    marginTop: -spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
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
  coverTitle: { ...compactType.title, fontFamily: nativeFonts.bold, color: colors.ink },
  coverMeta: { ...compactType.body, fontFamily: nativeFonts.regular, color: colors.textMuted },
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillActive: { borderColor: colors.teal, backgroundColor: colors.seaMist },
  pillText: { ...compactType.body, fontFamily: nativeFonts.medium, color: colors.ink },
});
