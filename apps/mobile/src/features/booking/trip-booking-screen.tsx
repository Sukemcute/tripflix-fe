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
  type TripPlanOffer,
} from '@tripflix/app-core';
import {
  commerceApi,
  createCheckoutOperation,
  getFutureDate,
  MAX_FLIGHT_SEATS,
  useApiSession,
  useFlightRoutes,
  useReelsFeed,
} from '@tripflix/api-client';
import { flightsControllerSearch } from '@tripflix/api-client/core-api/flights/flights';
import { t, vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { ApiErrorNotice } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import { mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { ChoiceChip, ProductCard, formatDay, styles } from './trip-plan-parts';
import {
  saveTripBooking,
  useTripBooking,
  useTripPicks,
  useTripHotel,
  type SelectedTripBooking,
} from './trip-booking-store';

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
  const hotel = useTripHotel(postId);
  const [openChooser, setOpenChooser] = useState<'origin' | null>(null);
  const items = trip.items ?? [];
  const days = Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1);
  const nights = getTripNights(days);
  const basePlan = getBookableTripPlan(trip);
  const plan = basePlan && applyTripPlanChoices(basePlan, { homeAirport, hotelId: hotel?.id });
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
  const choose = <T extends TripPlanOffer>(id: string, offers: T[]): T | null =>
    resolveTripPlanOffer(offers, picks, selectionKey, id);
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
  const hotelQuote = useQuery({
    queryKey: ['commerce', 'trip-plan-hotel', plan?.hotelId, checkIn, checkOut, adults],
    enabled: isReady && !!plan?.hotelId && isDateValid && isPassengerValid,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const stay = await commerceApi.getHotel(plan!.hotelId!, { checkIn, checkOut, adults }, signal);
      const offers = listTripPlanOffers(stay.rooms.map((room) => ({ ...room, plans: room.ratePlans }))).map(
        (offer) => {
          const room = stay.rooms.find((candidate) => candidate.productId === offer.productId)!;
          const rate = room.ratePlans.find((candidate) => candidate.code === offer.ratePlanCode)!;
          return { ...offer, checkIn, checkOut, roomName: room.name, rateName: rate.name };
        },
      );
      return { hotelName: stay.name, city: stay.city ?? stay.province.name, offers };
    },
  });
  const flightQuotes = flightQueries.map((query, index) =>
    !query.isFetching && !query.isError ? choose('f' + index, query.data ?? []) : null,
  );
  const room =
    !hotelQuote.isFetching && !hotelQuote.isError ? choose('hotel', hotelQuote.data?.offers ?? []) : null;
  const selectedFlights = flightQuotes.flatMap((flight, index) =>
    flight && !current.excluded.includes('f' + index) ? [flight] : [],
  );
  const selectedRooms = room && !current.excluded.includes('hotel') ? [room] : [];
  const isChecking = flightQueries.some((query) => query.isFetching) || hotelQuote.isFetching;
  const canBook =
    isReady &&
    isDateValid &&
    isPassengerValid &&
    !isChecking &&
    selectedFlights.length + selectedRooms.length > 0;
  const total = getTripPlanTotal([
    ...flightQuotes.map((offer, index) => ({ offer, isSelected: !current.excluded.includes('f' + index) })),
    { offer: room, isSelected: !current.excluded.includes('hotel') },
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
  });
  const book = () => {
    if (!canBook || booking.isPending) return;
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)/book' } });
      return;
    }
    booking.mutate();
  };
  const hotelName = hotel?.name ?? hotelQuote.data?.hotelName ?? trip.hotelName ?? copy.stayTitle;
  const hotelCard = plan?.hotelId && (
    <ProductCard
      tone="hotel"
      icon="bed"
      title={hotelName}
      detail={[t('mobile.tripPlan.hotelTitle', { nights }), room?.roomName, room?.rateName]
        .filter(Boolean)
        .join(' · ')}
      price={hotelQuote.isFetching ? '…' : room ? money(room.totalPrice) : undefined}
      status={
        hotelQuote.isError ? copy.quoteFailed : hotelQuote.isSuccess && !room ? copy.soldOutItem : undefined
      }
      isSelected={!!room && !current.excluded.includes('hotel')}
      isDisabled={!room || booking.isPending}
      onToggle={() => toggle('hotel')}
      onExpand={
        booking.isPending || !isDateValid || !isPassengerValid
          ? undefined
          : () =>
              router.push({
                pathname: '/hotel-rooms',
                params: {
                  id: plan.hotelId!,
                  checkIn,
                  checkOut,
                  adults: String(adults),
                  children: String(children),
                  infants: String(infants),
                  pick: 'trip',
                  pickId: 'hotel',
                  pickKey: selectionKey,
                  productId: room?.productId,
                  ratePlanCode: room?.ratePlanCode,
                },
              })
      }
      actionLabel={copy.changeHotel}
      onAction={
        booking.isPending || !isDateValid || !isPassengerValid
          ? undefined
          : () =>
              router.push({
                pathname: '/search',
                params: {
                  pick: 'trip',
                  pickId: 'hotelProperty',
                  pickKey: postId,
                  q: trip.destinationName || hotelQuote.data?.city || hotelName,
                  checkIn,
                  checkOut,
                  adults: String(adults),
                },
              })
      }
    />
  );

  return (
    <Screen
      title={copy.bookingTitle}
      back={false}
      compact
      background={colors.surface}
      scroll={false}
      padded={false}
      footer={
        <View style={styles.totalRow}>
          <View style={{ flex: 1 }}>
            <Txt style={styles.muted}>{copy.comboTotal}</Txt>
            <Txt style={styles.total}>{money(total)}</Txt>
            <Txt style={styles.muted}>{t('mobile.tripPlan.passengerSummary', passengers)}</Txt>
          </View>
          <Button compact icon="flash" disabled={!canBook || booking.isPending} onPress={book}>
            {booking.isPending ? copy.booking : copy.bookNow}
          </Button>
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.content, ui.pad]}>
        <View style={{ gap: spacing.sm }}>
          <View style={styles.tripHero}>
            {selected.coverUrl ? (
              <Image source={selected.coverUrl} contentFit="cover" style={styles.heroCover} />
            ) : (
              <View style={[styles.heroCover, styles.heroFallback]}>
                <Icon name="map-outline" size={mobileIconSize.control} color={colors.tealInk} />
              </View>
            )}
            <View style={styles.heroContent}>
              <Txt style={styles.cardTitle} numberOfLines={2}>
                {postTitle}
              </Txt>
              <Txt style={styles.muted} numberOfLines={2}>
                {[trip.destinationName, t('mobile.tripPlan.daysNights', { days, nights })]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
              <Txt style={styles.muted} numberOfLines={1}>
                {t('mobile.tripPlan.bookingBy', { name: authorName })}
              </Txt>
              <Pressable
                accessibilityRole="button"
                hitSlop={spacing.sm}
                accessibilityState={{ disabled: booking.isPending }}
                disabled={booking.isPending}
                onPress={() => saveTripBooking(null)}
                style={({ pressed }) => [styles.changeTrip, pressed && styles.pressed]}
              >
                <Icon name="swap-horizontal" size={14} color={colors.tealInk} />
                <Txt style={styles.heroChipText}>{copy.changeTrip}</Txt>
              </Pressable>
            </View>
          </View>
          {plan && (
            <View style={[styles.bookPanel, { backgroundColor: colors.seaMist }]}>
              <Row style={styles.totalRow}>
                <View style={{ flex: 1 }}>
                  <Txt style={styles.label}>
                    {formatDay(startDate)} · {t('mobile.tripPlan.daysNights', { days, nights })}
                  </Txt>
                  <Txt style={styles.muted}>{t('mobile.tripPlan.passengerSummary', passengers)}</Txt>
                </View>
                <Button
                  tone="text"
                  disabled={booking.isPending}
                  onPress={() => setEditing((value) => !value)}
                >
                  {isEditing ? copy.collapse : copy.change}
                </Button>
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
              <Txt style={styles.muted}>{copy.bookHint}</Txt>
              {!!quoteStatus && (
                <Txt style={styles.status} accessibilityLiveRegion="polite">
                  {quoteStatus}
                </Txt>
              )}
              <ApiErrorNotice error={booking.error} />
            </View>
          )}

          <View style={styles.timeline}>
            {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
              const flightLegs = (plan?.flights ?? [])
                .map((leg, legIndex) => ({ leg, legIndex }))
                .filter(({ leg }) => leg.day === day);
              const community = items.filter((item) => item.day === day && !item.transport);
              const selfArranged =
                basePlan?.selfArranged.filter((leg) => leg.day === day) ??
                items
                  .filter((item) => item.day === day && !!item.transport)
                  .map((item) => ({ day, title: item.title, mode: item.transport!.mode }));
              return (
                <View key={day} style={styles.day}>
                  {day < days && <View style={styles.rail} />}
                  <View style={styles.dayDot} />
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
                                ]
                                  .filter(Boolean)
                                  .join(' · ')
                              : copy.flightTitle
                          }
                          price={query.isFetching ? '…' : flight ? money(flight.totalPrice) : undefined}
                          status={
                            query.isError
                              ? copy.quoteFailed
                              : query.isSuccess && !flight
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
                    {day === 1 && hotelCard}
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
                              <Txt style={styles.description}>{item.title}</Txt>
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
  const posts = [
    ...new Map(
      (feed.data?.pages.flatMap((page) => page.items) ?? []).map((post) => [post.postId, post]),
    ).values(),
  ].filter(
    (post) =>
      post.postId !== selected?.postId && post.tripAttachment && getBookableTripPlan(post.tripAttachment),
  );
  const featured = (isDisabled: boolean) => (
    <View style={{ gap: spacing.md }}>
      <Txt variant="heading">{copy.featured}</Txt>
      <ApiErrorNotice
        error={feed.error}
        retry={() => {
          void feed.refetch();
        }}
      />
      {feed.isPending && <Txt style={styles.muted}>{vi.api.loading}</Txt>}
      {!feed.isPending && !feed.isError && posts.length === 0 && (
        <Txt style={styles.muted}>{copy.featuredEmpty}</Txt>
      )}
      {posts.map((post) => {
        const trip = post.tripAttachment!;
        const plan = getBookableTripPlan(trip)!;
        const days = Math.max(trip.daysCount ?? 0, ...(trip.items ?? []).map((item) => item.day), 1);
        const poster = post.video.posters.w360 || post.video.posters.w540 || post.video.posters.w720;
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
            style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}
          >
            {poster && <Image source={poster} contentFit="cover" style={styles.poster} />}
            <View style={styles.dayContent}>
              <Txt style={styles.cardTitle}>{post.title}</Txt>
              <Txt style={styles.muted}>
                {[trip.destinationName, t('mobile.tripPlan.dayCount', { days })].filter(Boolean).join(' · ')}
              </Txt>
              <Row style={styles.choices}>
                {plan.flights.length > 0 && (
                  <Row style={{ gap: spacing.xs }}>
                    <Icon name="airplane-outline" size={14} color={colors.tealInk} />
                    <Txt style={styles.muted}>
                      {t('mobile.tripPlan.flightCount', { count: plan.flights.length })}
                    </Txt>
                  </Row>
                )}
                {plan.hotelId && (
                  <Row style={{ gap: spacing.xs }}>
                    <Icon name="bed-outline" size={14} color={colors.coralInk} />
                    <Txt style={styles.muted}>{copy.hotelBadge}</Txt>
                  </Row>
                )}
              </Row>
            </View>
          </Pressable>
        );
      })}
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
    <Screen title={copy.bookingTitle} back={false} compact background={colors.surface}>
      <Txt style={styles.muted}>{copy.chooseHint}</Txt>
      {featured(false)}
    </Screen>
  );
}
