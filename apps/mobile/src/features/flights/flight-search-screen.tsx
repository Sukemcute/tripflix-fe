import { useMutation } from '@tanstack/react-query';
import {
  buildFlightCheckout,
  createCheckoutOperation,
  getFlightPassengerMix,
  getFlightToday,
  isValidFlightPassengerMix,
  MAX_FLIGHT_SEATS,
  parseFlightSearch,
  useApiSession,
  useFlightOffers,
  useFlightRoutes,
  type FlightPassengerMix,
  type FlightSearch,
} from '@tripflix/api-client';
import type { FlightOfferDto } from '@tripflix/api-client/core-api/model/index';
import {
  getFlightDurationMinutes,
  pickFlightHighlights,
  sortFlightGroups,
  type FlightSort,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import {
  Badge,
  Button,
  Card,
  Chip,
  Notice,
  PriceRow,
  Row,
  Screen,
  Sheet,
  Txt,
  formatDate,
  money,
  ui,
} from '@/components/mobile-ui';
import { saveTripPick, type TripBookingOffer } from '@/features/booking/trip-booking-store';
import { CommerceError } from '@/features/booking/commerce-state';
import { LoadingDots } from '@/components/loading-dots';
import {
  AirportField,
  FlightDateStrip,
  FlightHero,
  FlightSortChips,
  FlightTimeline,
  InfoField,
  SwapAirportsButton,
} from './flight-ui';

const copy = vi.flights;
const airportNames: Readonly<Record<string, string>> = copy.airports;
const PASSENGER_TYPES = [
  ['adult', 'passengers'],
  ['child', 'children'],
  ['infant', 'infants'],
] as const;
const getReason = (offer: FlightOfferDto) => (offer.reason ? copy.reasons[offer.reason] : copy.unavailable);

/** "2 người lớn, 1 trẻ em": chỉ kể loại khách có trong nhóm. */
function formatPassengerMix(mix: FlightPassengerMix): string {
  return (
    [
      ['adult', mix.adults],
      ['child', mix.children],
      ['infant', mix.infants],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([type, count]) => t(`flights.passengerTypes.${type}.count`, { count }))
    .join(', ');
}

/** Nhóm khách đang nhập trong form (chuỗi số như tham số URL). */
const readDraftMix = (draft: {
  passengers: string;
  children: string;
  infants: string;
}): FlightPassengerMix => ({
  adults: Number(draft.passengers) || 0,
  children: Number(draft.children) || 0,
  infants: Number(draft.infants) || 0,
});

type Picker = 'from' | 'to' | 'passengers';
type HoldSelection = {
  search: FlightSearch;
  flightKey: string;
  productId: string;
  fareCode: string;
  offer?: TripBookingOffer;
};

export function FlightSearchScreen() {
  const params = useLocalSearchParams();
  const read = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : '';
  };
  const isTripPick = read('pick') === 'trip';
  // Tự lên lộ trình (pickMode=builder): khách tự chọn chặng và ngày; đặt theo lộ trình thì chặng, ngày cố định.
  const isRouteLocked = isTripPick && read('pickMode') !== 'builder';
  const tripCopy = vi.mobile.tripPlan;
  const initial = {
    from: read('from'),
    to: read('to'),
    date: read('date'),
    passengers: read('passengers') || '1',
    children: read('children'),
    infants: read('infants'),
  };
  const search = parseFlightSearch(initial);
  // Chưa có chặng (mở từ tự lên lộ trình) vẫn giữ ngày được truyền vào thay vì về hôm nay.
  const [draft, setDraft] = useState({
    ...initial,
    date:
      search?.date ??
      (/^\d{4}-\d{2}-\d{2}$/.test(initial.date) && initial.date >= getFlightToday()
        ? initial.date
        : getFlightToday()),
  });
  const [picker, setPicker] = useState<Picker>();
  const [hasInvalidSearch, setInvalidSearch] = useState(false);
  const routes = useFlightRoutes();
  const { user, isReady } = useApiSession();
  const [createCheckout, setCreateCheckout] = useState(createCheckoutOperation);
  const hold = useMutation({
    retry: false,
    mutationFn: ({ search: submitted, productId, fareCode }: HoldSelection) =>
      createCheckout(buildFlightCheckout(submitted, productId, fareCode)),
    onSuccess: ({ orderId }) => router.replace({ pathname: '/checkout', params: { id: orderId } }),
  });
  const origins =
    routes.data?.map(({ airport }) => ({
      value: airport,
      label: airportNames[airport] ? airport + ' · ' + airportNames[airport] : airport,
    })) ?? [];
  const destinations =
    routes.data
      ?.find(({ airport }) => airport === draft.from)
      ?.destinations.map(({ code, name }) => ({
        value: code,
        label: code + ' · ' + name,
      })) ?? [];
  const choices = {
    from: { label: copy.from, options: origins },
    to: { label: copy.to, options: destinations },
  };
  const draftMix = readDraftMix(draft);
  // Thêm, bớt một khách mà vẫn đúng luật: tối đa 9 ghế, mỗi em bé một người lớn.
  const changePassengers = (field: (typeof PASSENGER_TYPES)[number][1], step: 1 | -1) => {
    const next = {
      ...draftMix,
      ...(field === 'passengers' ? { adults: draftMix.adults + step } : { [field]: draftMix[field] + step }),
    };
    const fixed = { ...next, infants: Math.min(next.infants, next.adults) };
    if (!isValidFlightPassengerMix(fixed)) return;
    setDraft((previous) => ({
      ...previous,
      passengers: String(fixed.adults),
      children: fixed.children ? String(fixed.children) : '',
      infants: fixed.infants ? String(fixed.infants) : '',
    }));
  };
  const isLocked = hold.isPending || hold.isSuccess;

  function submit() {
    const valid = parseFlightSearch(draft);
    if (!valid) {
      setInvalidSearch(true);
      return;
    }
    setInvalidSearch(false);
    hold.reset();
    setCreateCheckout(() => createCheckoutOperation());
    router.setParams({
      ...valid,
      passengers: String(valid.passengers),
      children: valid.children ? String(valid.children) : undefined,
      infants: valid.infants ? String(valid.infants) : undefined,
      productId: undefined,
      ratePlanCode: undefined,
    });
  }

  function chooseFlight(selection: HoldSelection) {
    if (!isReady || isLocked) return;
    if (isTripPick) {
      if (!read('pickKey') || !read('pickId') || !selection.offer) return;
      saveTripPick(read('pickKey'), read('pickId'), selection.offer);
      router.back();
      return;
    }
    if (!user) {
      const { children, infants, ...adultSearch } = selection.search;
      const query = new URLSearchParams({
        ...adultSearch,
        passengers: String(selection.search.passengers),
        ...(children ? { children: String(children) } : {}),
        ...(infants ? { infants: String(infants) } : {}),
        productId: selection.productId,
        ratePlanCode: selection.fareCode,
      });
      router.push({ pathname: '/login', params: { returnTo: '/flights?' + query } });
      return;
    }
    hold.mutate(selection);
  }

  return (
    <Screen title={isTripPick ? tripCopy.pickFlightTitle : copy.title}>
      {isTripPick ? (
        <>
          <Txt variant="title">{tripCopy.pickFlightTitle}</Txt>
          <Txt style={ui.muted}>
            {isRouteLocked ? tripCopy.pickNotice : vi.mobile.tripBuilder.pickFlightNotice}
          </Txt>
        </>
      ) : (
        <FlightHero />
      )}
      <Card>
        <View style={{ gap: spacing.sm }}>
          {(['from', 'to'] as const).map((key) => {
            const { label, options } = choices[key];
            const selection = options.find(({ value }) => value === draft[key]);
            const code = selection?.value ?? (isRouteLocked ? draft[key] : undefined);
            return (
              <AirportField
                key={key}
                icon={key === 'from' ? 'airplane-outline' : 'location-outline'}
                label={label}
                code={code || undefined}
                name={selection?.label.split(' · ').slice(1).join(' · ')}
                placeholder={key === 'to' && !draft.from ? copy.selectOriginFirst : copy.selectAirport}
                isDisabled={isRouteLocked || isLocked || !options.length}
                onPress={() => setPicker(key)}
              />
            );
          })}
          <SwapAirportsButton
            isDisabled={isRouteLocked || isLocked || !draft.from || !draft.to}
            onPress={() =>
              setDraft((previous) => {
                // Chỉ đổi được khi có chuyến chiều ngược lại; không có thì bỏ trống sân bay đến để chọn lại.
                const hasReturn = routes.data
                  ?.find(({ airport }) => airport === previous.to)
                  ?.destinations.some(({ code }) => code === previous.from);
                return { ...previous, from: previous.to, to: hasReturn ? previous.from : '' };
              })
            }
          />
        </View>
        <DateSingleField
          label={copy.date}
          value={draft.date}
          min={getFlightToday()}
          isDisabled={isRouteLocked || isLocked}
          onChange={(date) => setDraft((previous) => ({ ...previous, date }))}
        />
        <InfoField
          icon="people-outline"
          label={copy.adults}
          value={formatPassengerMix(draftMix)}
          isDisabled={isTripPick || isLocked}
          onPress={() => setPicker('passengers')}
        />
        <Button
          icon="search-outline"
          disabled={isRouteLocked || isLocked || !destinations.some(({ value }) => value === draft.to)}
          onPress={submit}
        >
          {copy.search}
        </Button>
        {hasInvalidSearch && <Notice tone="error">{copy.invalidSearch}</Notice>}
        {routes.isPending && <LoadingDots />}
        <ApiErrorNotice error={routes.error} retry={() => void routes.refetch()} />
        {routes.data?.length === 0 && <Notice>{copy.noRoutes}</Notice>}
      </Card>
      {picker === 'passengers' && (
        <Sheet title={copy.pickPassengers} visible onClose={() => setPicker(undefined)}>
          {PASSENGER_TYPES.map(([type, field]) => {
            const count = field === 'passengers' ? draftMix.adults : draftMix[field];
            const seats = draftMix.adults + draftMix.children;
            const canIncrease =
              type === 'infant' ? draftMix.infants < draftMix.adults : seats < MAX_FLIGHT_SEATS;
            const canDecrease = type === 'adult' ? draftMix.adults > 1 : count > 0;
            const label = copy.passengerTypes[type].label;
            return (
              <Row key={type} style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{label}</Txt>
                  <Txt variant="small" style={ui.muted}>
                    {copy.passengerTypes[type].hint}
                  </Txt>
                </View>
                <Row style={{ gap: spacing.sm }}>
                  <Button
                    tone="secondary"
                    disabled={!canDecrease}
                    onPress={() => changePassengers(field, -1)}
                  >
                    −
                  </Button>
                  <Txt variant="label" accessibilityLabel={label + ' ' + count}>
                    {count}
                  </Txt>
                  <Button tone="secondary" disabled={!canIncrease} onPress={() => changePassengers(field, 1)}>
                    +
                  </Button>
                </Row>
              </Row>
            );
          })}
          <Txt variant="small" style={ui.muted}>
            {copy.passengerRules}
          </Txt>
          <Button onPress={() => setPicker(undefined)}>{copy.passengersDone}</Button>
        </Sheet>
      )}
      {picker && picker !== 'passengers' && (
        <Sheet title={choices[picker].label} visible onClose={() => setPicker(undefined)}>
          {choices[picker].options.map(({ value, label }) => (
            <Chip
              key={value}
              selected={draft[picker] === value}
              onPress={() => {
                setDraft((previous) => ({
                  ...previous,
                  ...(picker === 'from' && previous.from !== value ? { to: '' } : {}),
                  [picker]: value,
                }));
                setPicker(undefined);
              }}
            >
              {label}
            </Chip>
          ))}
        </Sheet>
      )}
      {search && (
        <FlightResults
          key={JSON.stringify(search)}
          search={search}
          initialProductId={read('productId')}
          initialFareCode={read('ratePlanCode')}
          isLocked={!isReady || isLocked || (isTripPick && (!read('pickKey') || !read('pickId')))}
          isSignedIn={!!user}
          isTripPick={isTripPick}
          onChoose={chooseFlight}
          canChangeDate={!isRouteLocked && !isLocked}
          onChangeDate={(date) => {
            setDraft((previous) => ({ ...previous, date }));
            router.setParams({ date, productId: undefined, ratePlanCode: undefined });
          }}
          holdKey={hold.variables?.flightKey}
          holdError={hold.error}
          isHolding={hold.isPending}
        />
      )}
    </Screen>
  );
}

function FlightResults({
  search,
  initialProductId,
  initialFareCode,
  isTripPick = false,
  isLocked,
  isSignedIn,
  onChoose,
  holdKey,
  holdError,
  isHolding,
  canChangeDate,
  onChangeDate,
}: {
  canChangeDate: boolean;
  onChangeDate: (date: string) => void;
  search: FlightSearch;
  initialProductId: string;
  initialFareCode: string;
  isTripPick?: boolean;
  isLocked: boolean;
  isSignedIn: boolean;
  onChoose: (selection: HoldSelection) => void;
  holdKey?: string;
  holdError: unknown;
  isHolding: boolean;
}) {
  const query = useFlightOffers(search);
  const [sort, setSort] = useState<FlightSort>('recommended');
  const groups = sortFlightGroups(query.data ?? [], sort);
  const highlights = pickFlightHighlights(groups);
  const mix = getFlightPassengerMix(search);
  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Txt variant="title">{t('flights.results', { from: search.from, to: search.to })}</Txt>
        <Row style={{ gap: spacing.xs, flexWrap: 'wrap' }}>
          <Badge icon="calendar-outline">{formatDate(search.date)}</Badge>
          <Badge icon="people-outline">{formatPassengerMix(mix)}</Badge>
          {!!query.data?.length && (
            <Badge tone="sun">{t('flights.resultsCount', { count: query.data.length })}</Badge>
          )}
        </Row>
      </View>
      {canChangeDate && (
        <FlightDateStrip
          from={search.from}
          to={search.to}
          date={search.date}
          passengers={mix.adults}
          childCount={mix.children}
          infants={mix.infants}
          minDate={getFlightToday()}
          onChange={onChangeDate}
        />
      )}
      {(query.data?.length ?? 0) > 1 && <FlightSortChips value={sort} onChange={setSort} />}
      {query.isPending && <LoadingDots />}
      <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.data?.length === 0 && <Notice>{copy.empty}</Notice>}
      {groups.map(
        ([first, ...otherCabins], index) =>
          first && (
            <FlightCard
              key={first.flightKey}
              tags={[
                ...(highlights.cheapest === index ? [{ label: copy.cheapest, tone: 'coral' as const }] : []),
                ...(highlights.fastest === index ? [{ label: copy.fastest, tone: 'teal' as const }] : []),
              ]}
              flight={first}
              cabins={[first, ...otherCabins]}
              initialProductId={initialProductId}
              initialFareCode={initialFareCode}
              isTripPick={isTripPick}
              isLocked={isLocked}
              isHolding={isHolding && holdKey === first.flightKey}
              isSignedIn={isSignedIn}
              passengerMix={getFlightPassengerMix(search)}
              error={holdKey === first.flightKey ? holdError : null}
              onChoose={(productId, fareCode) => {
                const cabin = [first, ...otherCabins].find((offer) => offer.productId === productId);
                const fare = cabin?.fares.find((option) => option.code === fareCode);
                onChoose({
                  search,
                  productId,
                  fareCode,
                  flightKey: first.flightKey,
                  offer:
                    cabin && fare?.totalPrice != null
                      ? {
                          productId,
                          ratePlanCode: fareCode,
                          totalPrice: fare.totalPrice,
                          date: search.date,
                          from: search.from,
                          to: search.to,
                          flightNumber: cabin.flightNumber,
                          departTime: cabin.departTime,
                          cabinName: cabin.cabinName,
                          fareName: fare.name,
                        }
                      : undefined,
                });
              }}
            />
          ),
      )}
    </>
  );
}

function FlightCard({
  flight,
  cabins,
  initialProductId,
  initialFareCode,
  isTripPick = false,
  isLocked,
  isHolding,
  isSignedIn,
  passengerMix,
  onChoose,
  error,
  tags,
}: {
  tags: { label: string; tone: 'coral' | 'teal' }[];
  passengerMix: FlightPassengerMix;
  flight: FlightOfferDto;
  cabins: FlightOfferDto[];
  initialProductId: string;
  initialFareCode: string;
  isTripPick?: boolean;
  isLocked: boolean;
  isHolding: boolean;
  isSignedIn: boolean;
  onChoose: (productId: string, fareCode: string) => void;
  error: unknown;
}) {
  const initialCabin = cabins.find((offer) => offer.productId === initialProductId);
  const [productId, setProductId] = useState(initialCabin?.productId ?? flight.productId);
  const [fareCode, setFareCode] = useState(initialCabin ? initialFareCode : '');
  const cabin = cabins.find((offer) => offer.productId === productId) ?? flight;
  const fare = cabin.fares.find((option) => option.code === fareCode) ?? cabin.fares[0];
  const totalPrice = fare?.totalPrice;
  const unitPrice = fare?.pricePerPerson;
  const canBook = cabin.isAvailable && fare !== undefined && totalPrice != null && unitPrice != null;
  const isPicked = isTripPick && cabin.productId === initialProductId && fare?.code === initialFareCode;
  // Như web: thẻ gọn chỉ có giá "từ" và nút Chọn vé; bấm mới mở hạng ghế, gói vé. Quay lại chuyến đã chọn thì mở sẵn.
  const [isOpen, setIsOpen] = useState(!!initialCabin);
  const lowestPrice = Math.min(
    ...cabins.flatMap((offer) => (offer.isAvailable && offer.priceFrom != null ? [offer.priceFrom] : [])),
  );
  return (
    <Card style={isPicked ? { borderColor: colors.teal, borderWidth: 2 } : undefined}>
      {isPicked && (
        <Txt variant="label" style={{ color: colors.tealInk }}>
          {vi.mobile.tripPlan.picked}
        </Txt>
      )}
      <FlightTimeline
        airline={flight.airline}
        flightNumber={flight.flightNumber}
        cabinName={cabin.cabinName}
        fromAirport={flight.fromAirport}
        toAirport={flight.toAirport}
        departTime={flight.departTime}
        arriveTime={flight.arriveTime}
        durationMinutes={getFlightDurationMinutes(flight)}
        tags={tags}
      />
      {!isOpen && (
        <View style={cardStyles.summary}>
          <View style={{ flex: 1 }}>
            {Number.isFinite(lowestPrice) ? (
              <>
                <Txt variant="small" style={ui.muted}>
                  {copy.priceFrom}
                </Txt>
                <Txt style={cardStyles.price}>
                  {money(lowestPrice)}
                  <Txt variant="small" style={ui.muted}>
                    {copy.perGuestSuffix}
                  </Txt>
                </Txt>
              </>
            ) : (
              <Txt variant="small">{getReason(flight)}</Txt>
            )}
          </View>
          <Button
            compact
            icon="chevron-down"
            disabled={!Number.isFinite(lowestPrice)}
            onPress={() => setIsOpen(true)}
          >
            {copy.chooseFare}
          </Button>
        </View>
      )}
      {isOpen && (
        <>
          <Txt variant="label">{copy.cabin}</Txt>
          <Row style={{ gap: spacing.xs, flexWrap: 'wrap' }}>
            {cabins.map((offer) => (
              <Chip
                key={offer.productId}
                selected={offer.productId === cabin.productId}
                onPress={() => {
                  if (isLocked) return;
                  setProductId(offer.productId);
                  setFareCode('');
                }}
              >
                {offer.cabinName}
                {!offer.isAvailable && ' · ' + getReason(offer)}
              </Chip>
            ))}
          </Row>
          {cabin.isAvailable && cabin.fares.length > 0 && (
            <>
              <Txt variant="label">{copy.fare}</Txt>
              <Row style={{ gap: spacing.xs, flexWrap: 'wrap' }}>
                {cabin.fares.map((option) => (
                  <Chip
                    key={option.code}
                    selected={option.code === fare?.code}
                    onPress={() => {
                      if (!isLocked) setFareCode(option.code);
                    }}
                  >
                    {option.name}
                  </Chip>
                ))}
              </Row>
            </>
          )}
          {canBook ? (
            <>
              <PriceRow total label={vi.commerce.total} amount={money(totalPrice)} />
              <Txt variant="small" style={ui.muted}>
                {t('flights.perPassenger', { price: money(unitPrice) })}
                {passengerMix.children > 0 && fare.childPrice != null
                  ? ' · ' + copy.passengerTypes.child.label + ' ' + money(fare.childPrice)
                  : ''}
                {passengerMix.infants > 0 && fare.infantPrice != null
                  ? ' · ' + copy.passengerTypes.infant.label + ' ' + money(fare.infantPrice)
                  : ''}
              </Txt>
              {isTripPick && (fare.carryOnKg != null || fare.checkedKg != null) && (
                <Txt variant="small" style={ui.muted}>
                  {[
                    fare.carryOnKg != null ? t('mobile.tripPlan.carryOn', { kg: fare.carryOnKg }) : '',
                    fare.checkedKg != null ? t('mobile.tripPlan.checkedBaggage', { kg: fare.checkedKg }) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              )}
              {cabin.remaining != null && (
                <Txt variant="small">{t('flights.remaining', { count: cabin.remaining })}</Txt>
              )}
              <Txt variant="small">
                {fare.isRefundable && fare.freeCancelDays > 0
                  ? t('flights.freeCancel', { count: fare.freeCancelDays })
                  : fare.isRefundable
                    ? vi.commerce.refundable
                    : vi.commerce.nonRefundable}
              </Txt>
            </>
          ) : (
            <Notice tone="warning">{getReason(cabin)}</Notice>
          )}
          <Button
            disabled={!canBook || isLocked}
            onPress={() => fare && onChoose(cabin.productId, fare.code)}
          >
            {isHolding
              ? vi.api.loading
              : isTripPick
                ? vi.mobile.tripPlan.pickFlight
                : canBook && !isSignedIn
                  ? vi.commerce.login
                  : copy.choose}
          </Button>
        </>
      )}
      <CommerceError error={error} />
    </Card>
  );
}

const cardStyles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: -spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.coralTint,
  },
  price: { fontSize: 22, lineHeight: 28, fontFamily: nativeFonts.bold, color: colors.coralInk },
});
