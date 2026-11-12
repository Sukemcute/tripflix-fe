import { useMutation, useQuery } from '@tanstack/react-query';
import {
  applyTripPlanChoices,
  buildTripPlanCheckout,
  getBookableTripPlan,
  getTripDayDate,
  getTripNights,
  pickCheapestOffer,
} from '@tripflix/app-core';
import {
  commerceApi,
  createCheckoutOperation,
  getFutureDate,
  MAX_FLIGHT_SEATS,
  readPage,
  useApiSession,
  useFlightRoutes,
} from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { flightsControllerSearch } from '@tripflix/api-client/core-api/flights/flights';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, mobileLayout, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { BottomSheet } from '@/components/bottom-sheet';
import { DateSingleField } from '@/components/date-sheet';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Txt, type IconName } from '@/components/mobile-ui';
import { useAssistant } from '@/features/assistant/assistant-provider';

const copy = vi.mobile.tripPlan;
const DAY_DOT = 10;

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

/** Thẻ dịch vụ Tripflix bán được (vé bay, chỗ ở): nổi bật hơn gợi ý cộng đồng, có giá thật và nút đổi. */
function ProductCard({
  tone,
  icon,
  title,
  detail,
  price,
  status,
  actionLabel,
  isActionOpen,
  onAction,
  children,
}: {
  tone: 'flight' | 'hotel';
  icon: IconName;
  title: string;
  detail?: string;
  price?: string;
  status?: string;
  actionLabel?: string;
  isActionOpen?: boolean;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const accent = tone === 'flight' ? colors.teal : colors.coral;
  const ink = tone === 'flight' ? colors.tealInk : colors.coralInk;
  return (
    <View
      style={[
        styles.card,
        { borderColor: accent, backgroundColor: tone === 'flight' ? colors.seaMist : colors.warmMist },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: accent }]}>
          <Icon name={icon} size={18} color={colors.background} />
        </View>
        <View style={styles.cardBody}>
          <Txt style={[styles.otaBadge, { color: ink }]}>{copy.otaBadge}</Txt>
          <Txt style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Txt>
          {!!detail && (
            <Txt style={styles.cardDetail} numberOfLines={1}>
              {detail}
            </Txt>
          )}
        </View>
        <View style={styles.cardPrice}>
          {price ? <Txt style={[styles.price, { color: ink }]}>{price}</Txt> : null}
          {!!status && <Txt style={styles.cardStatus}>{status}</Txt>}
        </View>
      </View>
      {!!actionLabel && onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !!isActionOpen }}
          onPress={onAction}
          style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}
        >
          <Icon name="swap-horizontal" size={14} color={ink} />
          <Txt style={[styles.cardActionText, { color: ink }]}>{actionLabel}</Txt>
          <Icon name={isActionOpen ? 'chevron-up' : 'chevron-down'} size={14} color={ink} />
        </Pressable>
      )}
      {isActionOpen && children}
    </View>
  );
}

function ChoiceChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.choice, isSelected && styles.choiceSelected]}
    >
      <Txt style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>{label}</Txt>
    </Pressable>
  );
}

function HotelChooser({ onPick }: { onPick: (hotel: { id: string; name: string }) => void }) {
  const { isReady } = useApiSession();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const hotels = useQuery({
    queryKey: ['discovery', 'suggest', 'hotel', query],
    enabled: isReady && query.length >= 2,
    queryFn: async ({ signal }) =>
      readPage((await suggestControllerSuggest({ q: query, types: 'hotel' }, { signal })).data),
  });
  return (
    <View style={styles.chooser}>
      <View style={styles.searchBox}>
        <Icon name="search-outline" size={14} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          maxLength={100}
          placeholder={copy.hotelSearch}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={copy.hotelSearch}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.choices}>
        {(hotels.data?.items ?? [])
          .filter((hotel) => hotel.type === 'hotel')
          .slice(0, 6)
          .map((hotel) => (
            <ChoiceChip
              key={hotel.id}
              label={hotel.name}
              isSelected={false}
              onPress={() => onPick({ id: hotel.refId, name: hotel.name })}
            />
          ))}
      </View>
    </View>
  );
}

/**
 * Lộ trình người đăng chia sẻ. Vé bay và chỗ ở là dịch vụ Tripflix bán: hiện nổi bật, giá thật, người xem đổi được
 * điểm bay và khách sạn rồi "Đặt ngay" cả gói trong một đơn. Điểm ăn chơi là gợi ý cộng đồng, chỉ để tham khảo.
 */
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
  const routes = useFlightRoutes();
  const [startDate, setStartDate] = useState(() => getFutureDate(14));
  const [adults, setAdults] = useState(2);
  const [homeAirport, setHomeAirport] = useState<string>();
  const [hotel, setHotel] = useState<{ id: string; name: string }>();
  const [openChooser, setOpenChooser] = useState<'origin' | 'hotel' | null>(null);
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

  const quote = useQuery({
    queryKey: ['commerce', 'trip-plan-quote', plan, checkIn, checkOut, adults],
    enabled: visible && isReady && !!plan && isDateValid,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!plan) throw new Error('Trip plan cannot be booked');
      const [stay, flightQuotes] = await Promise.all([
        commerceApi.getHotel(plan.hotelId, { checkIn, checkOut, adults }, signal),
        Promise.all(
          plan.flights.map(async (leg) => {
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
          }),
        ),
      ]);
      const room = pickCheapestOffer(
        stay.rooms.map((offer) => ({
          productId: offer.productId,
          isAvailable: offer.isAvailable,
          plans: offer.ratePlans,
        })),
      );
      return { hotelName: stay.name, room: room && { ...room, checkIn, checkOut }, flights: flightQuotes };
    },
  });
  const flightQuotes = quote.data?.flights ?? [];
  const room = quote.data?.room ?? null;
  const isComplete = !!quote.data && !!room && flightQuotes.every((flight) => flight !== null);
  const canBook = isComplete && !quote.isFetching && !quote.isError;
  const total = canBook
    ? room!.totalPrice + flightQuotes.reduce((sum, flight) => sum + (flight?.totalPrice ?? 0), 0)
    : null;
  const quoteStatus = !isDateValid
    ? copy.invalidDate
    : quote.isFetching
      ? copy.checking
      : quote.isError
        ? copy.quoteFailed
        : quote.isSuccess && !isComplete
          ? copy.comboUnavailable
          : '';

  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () => {
      if (!canBook || !room) throw new Error('Trip plan quote is unavailable');
      return createCheckout(
        buildTripPlanCheckout({
          adults,
          sourcePostId: postId,
          flights: flightQuotes.flatMap((flight) => (flight ? [flight] : [])),
          rooms: [room],
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
  const priceOf = (offer: { totalPrice: number } | null | undefined) =>
    quote.isFetching ? '…' : offer ? money(offer.totalPrice) : undefined;
  const hotelName = hotel?.name ?? quote.data?.hotelName ?? trip.hotelName ?? copy.stayTitle;
  const hotelCard = trip.hotelId && (
    <ProductCard
      tone="hotel"
      icon="bed"
      title={hotelName}
      detail={t('mobile.tripPlan.hotelTitle', { nights })}
      price={plan ? priceOf(room) : undefined}
      status={plan && quote.isSuccess && !room ? copy.soldOutItem : undefined}
      actionLabel={plan ? copy.changeHotel : undefined}
      isActionOpen={openChooser === 'hotel'}
      onAction={() => setOpenChooser((open) => (open === 'hotel' ? null : 'hotel'))}
    >
      <HotelChooser
        onPick={(picked) => {
          setHotel(picked);
          setOpenChooser(null);
        }}
      />
    </ProductCard>
  );

  return (
    <BottomSheet
      visible={visible}
      compact
      title={trip.destinationName ?? postTitle}
      onClose={onClose}
      footer={
        plan ? (
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <View>
                <Txt style={styles.muted}>{copy.comboTotal}</Txt>
                <Txt style={styles.muted}>{t('mobile.tripPlan.forAdults', { adults })}</Txt>
              </View>
              <Txt style={styles.total}>{quote.isFetching ? '…' : total !== null ? money(total) : '—'}</Txt>
            </View>
            <Row style={styles.actions}>
              <Button compact tone="secondary" icon="sparkles-outline" onPress={askTripi}>
                {copy.askTripi}
              </Button>
              <Button compact icon="flash" disabled={!canBook || booking.isPending} onPress={book}>
                {booking.isPending ? copy.booking : copy.bookNow}
              </Button>
            </Row>
          </View>
        ) : undefined
      }
    >
      <View style={styles.hero}>
        <Row style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Icon name="calendar-outline" size={12} color={colors.tealInk} />
            <Txt style={styles.heroChipText}>{t('mobile.tripPlan.daysNights', { days, nights })}</Txt>
          </View>
          {basePlan && (
            <View style={[styles.heroChip, styles.heroChipHot]}>
              <Icon name="flash" size={12} color={colors.coralInk} />
              <Txt style={[styles.heroChipText, { color: colors.coralInk }]}>{copy.bookableBadge}</Txt>
            </View>
          )}
        </Row>
        <Txt style={styles.muted}>{t('mobile.tripPlan.by', { name: authorName })}</Txt>
      </View>

      {plan && (
        <View style={styles.bookPanel}>
          <Txt style={styles.bookTitle}>{copy.bookTitle}</Txt>
          <Txt style={styles.muted}>{copy.bookHint}</Txt>
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
            <View style={styles.stepper}>
              <IconButton
                name="remove"
                size={mobileIconSize.control}
                label={copy.removeAdult}
                disabled={booking.isPending || adults === 1}
                onPress={() => setAdults((value) => Math.max(1, value - 1))}
              />
              <View style={styles.stepperValue}>
                <Icon name="people-outline" size={14} color={colors.ink} />
                <Txt style={styles.label}>{adults}</Txt>
              </View>
              <IconButton
                name="add"
                size={mobileIconSize.control}
                label={copy.addAdult}
                disabled={booking.isPending || adults === MAX_FLIGHT_SEATS}
                onPress={() => setAdults((value) => Math.min(MAX_FLIGHT_SEATS, value + 1))}
              />
            </View>
          </View>
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
          const community = items.filter((item) => item.day === day && item.transport?.mode !== 'flight');
          return (
            <View key={day} style={styles.day}>
              {day < days && <View style={styles.rail} />}
              <View style={styles.dayDot} />
              <View style={styles.dayContent}>
                <Txt style={styles.dayLabel}>
                  {isDateValid
                    ? t('mobile.tripPlan.dayDate', { day, date: formatDay(getTripDayDate(startDate, day)) })
                    : t('mobile.tripPlan.day', { day })}
                </Txt>
                {flightLegs.map(({ leg, legIndex }) => {
                  const flight = flightQuotes[legIndex];
                  const isOutbound = legIndex === 0;
                  return (
                    <ProductCard
                      key={`f${legIndex}`}
                      tone="flight"
                      icon="airplane"
                      title={`${leg.from} → ${leg.to}`}
                      detail={
                        flight
                          ? [copy.flightTitle, flight.flightNumber, flight.departTime?.slice(0, 5)]
                              .filter(Boolean)
                              .join(' · ')
                          : copy.flightTitle
                      }
                      price={priceOf(flight)}
                      status={quote.isSuccess && flight === null ? copy.soldOutItem : undefined}
                      actionLabel={isOutbound && origins.length > 1 ? copy.changeOrigin : undefined}
                      isActionOpen={isOutbound && openChooser === 'origin'}
                      onAction={() => setOpenChooser((open) => (open === 'origin' ? null : 'origin'))}
                    >
                      <View style={styles.chooser}>
                        <Txt style={styles.muted}>{copy.departFrom}</Txt>
                        <View style={styles.choices}>
                          {origins.map((code) => (
                            <ChoiceChip
                              key={code}
                              label={code}
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  muted: { ...compactType.meta, color: colors.textMuted },
  pressed: { opacity: 0.7 },
  hero: { gap: spacing.xs, marginBottom: spacing.md },
  heroChips: { gap: spacing.xs, flexWrap: 'wrap' },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.seaMist,
  },
  heroChipHot: { backgroundColor: colors.coralTint },
  heroChipText: { ...compactType.label, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  bookPanel: {
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: mobileLayout.cardRadius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  filters: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  date: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: mobileLayout.touchTarget,
    backgroundColor: colors.background,
    borderRadius: mobileLayout.inputRadius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { ...compactType.label, fontFamily: nativeFonts.semibold },
  status: { ...compactType.meta, color: colors.coralInk },
  timeline: { gap: 0 },
  day: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg },
  rail: {
    position: 'absolute',
    left: DAY_DOT / 2 - 1,
    top: DAY_DOT + 4,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  dayDot: {
    width: DAY_DOT,
    height: DAY_DOT,
    marginTop: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.coralTint,
  },
  dayContent: { flex: 1, minWidth: 0, gap: spacing.sm },
  dayLabel: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  card: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  otaBadge: {
    ...compactType.meta,
    fontFamily: nativeFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  cardDetail: { ...compactType.meta, color: colors.textMuted },
  cardPrice: { alignItems: 'flex-end', maxWidth: 110 },
  price: { ...compactType.heading, fontFamily: nativeFonts.semibold },
  cardStatus: { ...compactType.meta, color: colors.danger, textAlign: 'right' },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  cardActionText: { ...compactType.label, fontFamily: nativeFonts.semibold },
  chooser: { gap: spacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  choiceSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceText: { ...compactType.label, color: colors.ink },
  choiceTextSelected: { color: colors.background, fontFamily: nativeFonts.semibold },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...compactType.body, color: colors.ink },
  community: { gap: spacing.xs, paddingTop: 2 },
  communityLabel: {
    ...compactType.meta,
    fontFamily: nativeFonts.semibold,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  stopText: { flex: 1, gap: 1 },
  description: { ...compactType.body, color: colors.ink },
  footer: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  total: { ...compactType.title, fontFamily: nativeFonts.semibold, color: colors.coralInk },
  actions: { gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
