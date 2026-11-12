import { useMutation, useQuery } from '@tanstack/react-query';
import { buildTripPlanCheckout, getBookableTripPlan, getTripDayDate, getTripNights, pickCheapestOffer } from '@tripflix/app-core';
import { commerceApi, createCheckoutOperation, getFutureDate, MAX_FLIGHT_SEATS, useApiSession } from '@tripflix/api-client';
import { flightsControllerSearch } from '@tripflix/api-client/core-api/flights/flights';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { BottomSheet } from '@/components/bottom-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Field, Icon, IconButton, money, Row, Txt } from '@/components/mobile-ui';
import { useAssistant } from '@/features/assistant/assistant-provider';

const copy = vi.mobile.tripPlan;
const PIN_SIZE = 22;
const DASH_LENGTH = 4;
const DASH_GAP = 3;

function RouteConnector() {
  const [dashCount, setDashCount] = useState(0);
  return (
    <View
      pointerEvents="none"
      style={styles.connector}
      onLayout={({ nativeEvent }) => setDashCount(Math.ceil(nativeEvent.layout.height / (DASH_LENGTH + DASH_GAP)))}
    >
      {Array.from({ length: dashCount }, (_, index) => (
        <View key={index} style={styles.dash} />
      ))}
    </View>
  );
}

export function TripPlanSheet({
  visible,
  onClose,
  postId,
  postTitle,
  authorName,
  trip,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  authorName: string;
  trip: TripAttachmentDto;
}) {
  const { isReady, user } = useApiSession();
  const assistant = useAssistant();
  const [startDate, setStartDate] = useState(() => getFutureDate(14));
  const [adults, setAdults] = useState(2);
  const date = new Date(`${startDate}T00:00:00Z`);
  const isDateValid =
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === startDate && startDate >= getFutureDate(0);
  const items = trip.items ?? [];
  const days = Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1);
  const nights = getTripNights(days);
  const plan = getBookableTripPlan(trip);
  const checkIn = isDateValid ? startDate : '';
  const checkOut = isDateValid ? getTripDayDate(startDate, nights + 1) : '';

  const quote = useQuery({
    queryKey: ['commerce', 'trip-plan-quote', plan, checkIn, checkOut, adults],
    enabled: visible && isReady && !!plan && isDateValid,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!plan) throw new Error('Trip plan cannot be booked');
      const [hotel, flightQuotes] = await Promise.all([
        commerceApi.getHotel(plan.hotelId, { checkIn, checkOut, adults }, signal),
        Promise.all(plan.flights.map(async (leg) => {
          const date = getTripDayDate(startDate, leg.day);
          const { data } = await flightsControllerSearch(
            { from: leg.from, to: leg.to, date, passengers: adults },
            { signal },
          );
          const offer = pickCheapestOffer(
            data.flights.map((flight) => ({
              productId: flight.productId,
              isAvailable: flight.isAvailable,
              plans: flight.fares,
            })),
          );
          if (!offer) return null;
          const flight = data.flights.find((candidate) => candidate.productId === offer.productId);
          return { ...offer, date, flightNumber: flight?.flightNumber, departTime: flight?.departTime };
        })),
      ]);
      const room = pickCheapestOffer(
        hotel.rooms.map((room) => ({ productId: room.productId, isAvailable: room.isAvailable, plans: room.ratePlans })),
      );
      const flights = flightQuotes.filter((flight) => flight !== null);
      if (!room || flights.length !== flightQuotes.length) return null;
      return {
        flights,
        room: { ...room, checkIn, checkOut },
        total: room.totalPrice + flights.reduce((total, flight) => total + flight.totalPrice, 0),
      };
    },
  });
  const currentQuote = quote.data;
  const canBook = !!currentQuote && !quote.isFetching && !quote.isError;
  const quoteStatus = !isDateValid
    ? copy.invalidDate
    : quote.isFetching
      ? copy.checking
      : quote.isError
        ? copy.quoteFailed
        : quote.isSuccess && !currentQuote
          ? copy.comboUnavailable
          : '';

  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () => {
      if (!currentQuote || !canBook) throw new Error('Trip plan quote is unavailable');
      return createCheckout(
        buildTripPlanCheckout({
          adults,
          sourcePostId: postId,
          flights: currentQuote.flights,
          rooms: [currentQuote.room],
        }),
      );
    },
    onSuccess: ({ orderId }) => {
      onClose();
      router.push({ pathname: '/checkout', params: { id: orderId } });
    },
  });
  const book = () => {
    if (!canBook || booking.isPending) return;
    if (!user) {
      onClose();
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)' } });
      return;
    }
    booking.mutate();
  };
  const askTripi = () => {
    onClose();
    assistant.setDraft(t('mobile.tripPlan.askTripiPrompt', { title: postTitle, date: startDate, adults }));
    assistant.openDialog();
  };

  return (
    <BottomSheet
      visible={visible}
      compact
      title={t('mobile.tripPlan.title', { days, destination: trip.destinationName ?? postTitle })}
      onClose={onClose}
      footer={plan && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Txt variant="caption" style={styles.muted}>{copy.comboTotal}</Txt>
            <Txt variant="heading" style={styles.total}>
              {quote.isFetching ? '…' : canBook ? money(currentQuote.total) : '—'}
            </Txt>
          </View>
          <Row style={styles.actions}>
            <Button compact tone="secondary" icon="sparkles-outline" onPress={askTripi}>
              {copy.askTripi}
            </Button>
            <Button compact disabled={!canBook || booking.isPending} onPress={book}>
              {booking.isPending ? copy.booking : copy.bookNow}
            </Button>
          </Row>
        </View>
      )}
    >
      <Txt variant="caption" style={[styles.muted, styles.byline]}>
        {t('mobile.tripPlan.by', { name: authorName })}
      </Txt>
      {items.length > 0 && (
        <View style={styles.timeline}>
          {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
            <View key={day} style={[styles.day, day < days && styles.dayWithNext]}>
              {day < days && <RouteConnector />}
              <View style={styles.pin}>
                <Icon name="location" size={mobileIconSize.control} color={colors.tealInk} />
              </View>
              <View style={styles.dayContent}>
                <Txt variant="label" style={styles.dayLabel}>
                  {t('mobile.tripPlan.day', { day })}
                </Txt>
                {items
                  .filter((item) => item.day === day)
                  .map((item, index) => (
                    <View key={index} style={styles.stop}>
                      <Txt style={styles.description}>{item.title}</Txt>
                      {!!(item.location || item.notes) && (
                        <Txt variant="caption" style={styles.muted}>
                          {[item.location, item.notes].filter(Boolean).join(' · ')}
                        </Txt>
                      )}
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </View>
      )}
      {plan ? (
        <View style={styles.controls}>
          <View style={styles.stay}>
            <Icon name="bed-outline" size={mobileIconSize.control} color={colors.tealInk} />
            <Txt style={styles.stayDescription}>
              {t('mobile.tripPlan.stay', { hotel: trip.hotelName || copy.stayTitle, nights })}
            </Txt>
          </View>
          <View style={styles.filters}>
            <View style={styles.date}>
              <Field
                compact
                label={copy.startDate}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                editable={!booking.isPending}
              />
            </View>
            <View style={styles.travellers}>
              <Txt variant="label" style={styles.label}>
                {copy.adults}
              </Txt>
              <View style={styles.stepper}>
                <IconButton
                  name="remove"
                  size={mobileIconSize.control}
                  label={copy.removeAdult}
                  disabled={booking.isPending || adults === 1}
                  onPress={() => setAdults((value) => Math.max(1, value - 1))}
                />
                <Txt variant="label" style={styles.label}>
                  {adults}
                </Txt>
                <IconButton
                  name="add"
                  size={mobileIconSize.control}
                  label={copy.addAdult}
                  disabled={booking.isPending || adults === MAX_FLIGHT_SEATS}
                  onPress={() => setAdults((value) => Math.min(MAX_FLIGHT_SEATS, value + 1))}
                />
              </View>
            </View>
          </View>
          {plan.flights.map((leg, index) => {
            const flight = canBook ? currentQuote.flights[index] : undefined;
            return (
              <View key={index} style={styles.stay}>
                <Icon name="airplane-outline" size={mobileIconSize.control} color={colors.tealInk} />
                <Txt style={styles.stayDescription} numberOfLines={1}>
                  {t('mobile.tripPlan.flightLeg', { day: leg.day, from: leg.from, to: leg.to })}
                  {flight?.flightNumber && ` · ${flight.flightNumber}`}
                  {flight?.departTime && ` · ${flight.departTime.slice(0, 5)}`}
                </Txt>
              </View>
            );
          })}
          <Txt variant="caption" style={[styles.muted, styles.quoteStatus]} numberOfLines={2} accessibilityLiveRegion="polite">
            {quoteStatus}
          </Txt>
          <ApiErrorNotice error={booking.error} />
        </View>
      ) : trip.hotelName ? (
        <View style={styles.stay}>
          <Icon name="bed-outline" size={mobileIconSize.control} color={colors.tealInk} />
          <Txt style={styles.stayDescription}>{trip.hotelName}</Txt>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  muted: { ...compactType.meta, color: colors.textMuted },
  byline: { marginBottom: spacing.md },
  timeline: { marginBottom: spacing.md },
  day: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dayWithNext: { paddingBottom: spacing.md },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    position: 'absolute',
    top: PIN_SIZE + 2,
    bottom: 2,
    left: (PIN_SIZE - 2) / 2,
    width: 2,
    gap: DASH_GAP,
    overflow: 'hidden',
  },
  dash: { height: DASH_LENGTH, borderRadius: 1, backgroundColor: colors.teal },
  dayContent: { flex: 1, minWidth: 0, paddingTop: 2, gap: spacing.xs },
  dayLabel: { ...compactType.label, color: colors.tealInk },
  stop: { gap: 2 },
  description: compactType.body,
  controls: { gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.md },
  stay: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stayDescription: { ...compactType.body, flex: 1 },
  quoteStatus: { minHeight: compactType.meta.lineHeight * 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  date: { flex: 1, minWidth: 112 },
  travellers: { gap: spacing.xs },
  label: compactType.label,
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: mobileLayout.touchTarget,
    backgroundColor: colors.background,
    borderRadius: mobileLayout.inputRadius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  total: compactType.price,
  actions: { gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
