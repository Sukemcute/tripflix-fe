import { useMutation } from '@tanstack/react-query';
import { buildTripPlanCheckout, getTripDayDate, readSoldOutConflict } from '@tripflix/app-core';
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
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import { LoadingDots } from '@/components/loading-dots';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Button, Icon, IconButton, money, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { DestinationPicker } from '@/features/post/trip-plan-editor';
import { CommerceError } from './commerce-state';
import { ChoiceChip } from './trip-plan-parts';

const copy = vi.mobile.tripBuilder;
const MAX_ADULTS = 9;

type FlightSort = 'cheapest' | 'best_time';
type StaySort = 'best_price' | 'top_rated';

/**
 * Tự lên lộ trình ở tab Đặt (TF105): khách chọn nơi đến, ngày, số khách rồi thêm vé bay hai chiều và chỗ ở
 * từ gợi ý của discovery (GET /api/trip-builder/*), giữ chỗ chung một đơn như đặt theo lộ trình.
 */
export function TripBuilderScreen() {
  const { user } = useApiSession();
  const routes = useFlightRoutes();
  const [destination, setDestination] = useState({ destinationName: '', destinationPlaceId: '' });
  const [departDate, setDepartDate] = useState(() => getFutureDate(14));
  const [nights, setNights] = useState(2);
  const [adults, setAdults] = useState(2);
  const [from, setFrom] = useState('SGN');
  const [flightSort, setFlightSort] = useState<{ outbound: FlightSort; inbound: FlightSort }>({
    outbound: 'cheapest',
    inbound: 'best_time',
  });
  const [staySort, setStaySort] = useState<StaySort>('best_price');
  const [picked, setPicked] = useState<{
    outbound: TripFlightSuggestion | null;
    inbound: TripFlightSuggestion | null;
    stay: TripStaySuggestion | null;
  }>({ outbound: null, inbound: null, stay: null });

  const place = destination.destinationPlaceId;
  const returnDate = getTripDayDate(departDate, nights + 1);
  const isDateValid = departDate >= getFutureDate(0);
  const canSuggest = !!place && isDateValid;
  // Đổi điều kiện thì bỏ lựa chọn cũ: giá và chỗ của ngày, số khách cũ không còn đúng.
  const conditionKey = JSON.stringify([place, from, departDate, nights, adults]);
  const [pickedKey, setPickedKey] = useState(conditionKey);
  if (pickedKey !== conditionKey) {
    setPickedKey(conditionKey);
    setPicked({ outbound: null, inbound: null, stay: null });
  }

  const outbound = useTripFlightSuggestions(
    canSuggest ? { place, from, departDate, returnDate, adults, sort: flightSort.outbound } : null,
  );
  const inbound = useTripFlightSuggestions(
    canSuggest ? { place, from, departDate, returnDate, adults, sort: flightSort.inbound } : null,
  );
  const stays = useTripStaySuggestions(
    canSuggest ? { place, checkIn: departDate, checkOut: returnDate, adults, sort: staySort } : null,
  );
  // Sân bay đang chọn đứng đầu để luôn thấy ngay, không phải cuộn tìm.
  const origins = [
    from,
    ...(routes.data ?? []).map((route) => route.airport).filter((code) => code !== from),
  ];

  const total =
    (picked.outbound?.totalPrice ?? 0) + (picked.inbound?.totalPrice ?? 0) + (picked.stay?.totalPrice ?? 0);
  const pickedCount = [picked.outbound, picked.inbound, picked.stay].filter(Boolean).length;
  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () =>
      createCheckout(
        buildTripPlanCheckout({
          adults,
          flights: [
            ...(picked.outbound ? [{ ...picked.outbound, date: departDate }] : []),
            ...(picked.inbound ? [{ ...picked.inbound, date: returnDate }] : []),
          ],
          rooms: picked.stay
            ? [
                {
                  productId: picked.stay.roomProductId,
                  ratePlanCode: picked.stay.ratePlanCode,
                  checkIn: departDate,
                  checkOut: returnDate,
                },
              ]
            : [],
        }),
      ),
    onSuccess: ({ orderId }) => router.push({ pathname: '/checkout', params: { id: orderId } }),
    // Hết chỗ lúc giữ thì tải lại gợi ý để khách thấy lựa chọn còn bán.
    onError: (error) => {
      if (!(error instanceof HttpError && readSoldOutConflict(error.body))) return;
      void outbound.refetch();
      void inbound.refetch();
      void stays.refetch();
    },
  });
  const book = () => {
    if (!pickedCount || booking.isPending) return;
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
            <Txt style={styles.muted}>{t('mobile.tripBuilder.pickedCount', { count: pickedCount })}</Txt>
            <Txt style={styles.total}>{money(total)}</Txt>
          </View>
          <Button compact icon="flash" disabled={!pickedCount || booking.isPending} onPress={book}>
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
        <DateSingleField
          label={copy.departDate}
          value={departDate}
          min={getFutureDate(0)}
          onChange={setDepartDate}
        />
        <Stepper
          label={t('mobile.tripBuilder.nights', { count: nights })}
          value={nights}
          min={1}
          max={14}
          onChange={setNights}
        />
        <Stepper
          label={t('mobile.tripBuilder.adults', { count: adults })}
          value={adults}
          min={1}
          max={MAX_ADULTS}
          onChange={setAdults}
        />
        {!place && <Txt style={styles.muted}>{copy.pickDestinationHint}</Txt>}
      </View>

      {canSuggest && (
        <Section
          tone="flight"
          icon="airplane"
          title={t('mobile.tripBuilder.flightsTitle', { place: destination.destinationName })}
        >
          <Row style={styles.origin}>
            <Txt style={styles.originLabel}>{copy.flyFrom}</Txt>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.originChips}
            >
              {origins.map((code) => (
                <ChoiceChip
                  key={code}
                  label={code}
                  isSelected={code === from}
                  onPress={() => setFrom(code)}
                />
              ))}
            </ScrollView>
          </Row>
          {(['outbound', 'inbound'] as const).map((leg) => {
            const query = leg === 'outbound' ? outbound : inbound;
            const options = query.data?.[leg] ?? [];
            return (
              <View key={leg} style={styles.leg}>
                <Txt style={styles.legTitle}>
                  {leg === 'outbound'
                    ? t('mobile.tripBuilder.outbound', { date: formatShortDate(departDate) })
                    : t('mobile.tripBuilder.inbound', { date: formatShortDate(returnDate) })}
                </Txt>
                <Row style={styles.chips}>
                  {(['cheapest', 'best_time'] as const).map((sort) => (
                    <ChoiceChip
                      key={sort}
                      label={copy.flightSorts[sort]}
                      isSelected={flightSort[leg] === sort}
                      onPress={() => setFlightSort({ ...flightSort, [leg]: sort })}
                    />
                  ))}
                </Row>
                <OptionList
                  isLoading={query.isFetching && !query.data}
                  error={query.error}
                  retry={() => void query.refetch()}
                  isEmpty={options.length === 0}
                  tone="flight"
                  isNoneSelected={!picked[leg]}
                  onNone={() => setPicked({ ...picked, [leg]: null })}
                >
                  {options.map((flight) => (
                    <OptionRow
                      key={flight.flightId}
                      tone="flight"
                      isSelected={picked[leg]?.flightId === flight.flightId}
                      onPress={() => setPicked({ ...picked, [leg]: flight })}
                      title={`${flight.departTime ?? '--:--'} → ${flight.arriveTime ?? '--:--'} · ${flight.fromAirport} → ${flight.toAirport}`}
                      detail={[
                        flight.airline,
                        t('mobile.tripBuilder.perPerson', { amount: money(flight.unitPrice) }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      price={money(flight.totalPrice)}
                      reason={flight.reason?.text}
                    />
                  ))}
                </OptionList>
              </View>
            );
          })}
        </Section>
      )}

      {canSuggest && (
        <Section
          tone="hotel"
          icon="bed"
          title={t('mobile.tripBuilder.staysTitle', { place: destination.destinationName })}
        >
          <Txt style={styles.muted}>
            {t('mobile.tripBuilder.stayRange', {
              checkIn: formatShortDate(departDate),
              checkOut: formatShortDate(returnDate),
              nights,
            })}
          </Txt>
          <Row style={styles.chips}>
            {(['best_price', 'top_rated'] as const).map((sort) => (
              <ChoiceChip
                key={sort}
                label={copy.staySorts[sort]}
                isSelected={staySort === sort}
                onPress={() => setStaySort(sort)}
              />
            ))}
          </Row>
          <OptionList
            isLoading={stays.isFetching && !stays.data}
            error={stays.error}
            retry={() => void stays.refetch()}
            isEmpty={(stays.data ?? []).length === 0}
            tone="hotel"
            isNoneSelected={!picked.stay}
            onNone={() => setPicked({ ...picked, stay: null })}
          >
            {(stays.data ?? []).map((stay) => (
              <OptionRow
                key={stay.hotelId}
                tone="hotel"
                isSelected={picked.stay?.hotelId === stay.hotelId}
                onPress={() => setPicked({ ...picked, stay })}
                title={stay.name}
                detail={[
                  stay.stars ? `${stay.stars}★` : null,
                  t('mobile.tripBuilder.perNight', { amount: money(stay.unitPrice) }),
                  stay.rating ? `${stay.rating.average}/5` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                price={money(stay.totalPrice)}
                reason={stay.reason?.text}
              />
            ))}
          </OptionList>
        </Section>
      )}
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

const TONES = {
  flight: { ink: colors.tealInk, soft: colors.seaMist },
  hotel: { ink: colors.coralInk, soft: colors.coralTint },
} as const;

function Section({
  tone,
  icon,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  icon: 'airplane' | 'bed';
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, { borderColor: TONES[tone].ink, backgroundColor: TONES[tone].soft }]}>
      <Row style={styles.sectionHead}>
        <Icon name={icon} size={18} color={TONES[tone].ink} />
        <Txt style={styles.sectionTitle}>{title}</Txt>
      </Row>
      {children}
    </View>
  );
}

function OptionList({
  isLoading,
  error,
  retry,
  isEmpty,
  tone,
  isNoneSelected,
  onNone,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  retry: () => void;
  isEmpty: boolean;
  tone: keyof typeof TONES;
  isNoneSelected: boolean;
  onNone: () => void;
  children: ReactNode;
}) {
  if (isLoading) return <LoadingDots />;
  return (
    <View style={styles.options}>
      <ApiErrorNotice error={error} retry={retry} />
      {!error && isEmpty && <Txt style={styles.muted}>{copy.empty}</Txt>}
      {children}
      <OptionRow tone={tone} isSelected={isNoneSelected} onPress={onNone} title={copy.none} />
    </View>
  );
}

function OptionRow({
  tone,
  isSelected,
  onPress,
  title,
  detail,
  price,
  reason,
}: {
  tone: keyof typeof TONES;
  isSelected: boolean;
  onPress: () => void;
  title: string;
  detail?: string;
  price?: string;
  reason?: string;
}) {
  const ink = TONES[tone].ink;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, isSelected && { borderColor: ink }, pressed && styles.pressed]}
    >
      <Icon
        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={isSelected ? ink : colors.textMuted}
      />
      <View style={ui.flex}>
        <Txt style={styles.optionTitle} numberOfLines={2}>
          {title}
        </Txt>
        {!!detail && <Txt style={styles.muted}>{detail}</Txt>}
        {!!reason && (
          <View style={[styles.reason, { backgroundColor: TONES[tone].soft }]}>
            <Txt style={[styles.reasonText, { color: ink }]}>{reason}</Txt>
          </View>
        )}
      </View>
      {!!price && <Txt style={styles.price}>{price}</Txt>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  muted: { ...compactType.body, fontFamily: nativeFonts.regular, color: colors.textMuted },
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
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sectionHead: { alignItems: 'center', gap: spacing.xs },
  sectionTitle: { ...compactType.title, fontFamily: nativeFonts.bold, color: colors.ink, flexShrink: 1 },
  origin: { alignItems: 'center', gap: spacing.sm },
  originLabel: {
    ...compactType.body,
    fontFamily: nativeFonts.regular,
    color: colors.textMuted,
    flexShrink: 0,
  },
  chips: { gap: spacing.sm, flexWrap: 'wrap' },
  originChips: { gap: spacing.sm },
  leg: { gap: spacing.sm },
  legTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.tealInk },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  optionTitle: { ...compactType.heading, fontFamily: nativeFonts.semibold, color: colors.ink },
  reason: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reasonText: { ...compactType.label, fontFamily: nativeFonts.semibold },
  price: { ...compactType.price, fontFamily: nativeFonts.bold, color: colors.ink },
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
