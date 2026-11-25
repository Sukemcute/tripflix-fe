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
import { explorer as x, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { DateSingleField } from '@/components/date-sheet';
import {
  Badge,
  Button,
  Card,
  Icon,
  Notice,
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
import { typeStyle } from '@/components/type-scale';
import {
  AirportField,
  FlightAirlineMark,
  formatFlightDuration,
  AirportPickerList,
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
          <AirportPickerList
            options={choices[picker].options}
            selected={draft[picker]}
            onSelect={(value) => {
              setDraft((previous) => ({
                ...previous,
                ...(picker === 'from' && previous.from !== value ? { to: '' } : {}),
                [picker]: value,
              }));
              setPicker(undefined);
            }}
          />
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
              date={search.date}
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
  date,
}: {
  date: string;
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
    <Card
      style={[
        isOpen && ticketStyles.card,
        isPicked ? { borderColor: x.day.link, borderWidth: 2 } : undefined,
      ]}
    >
      {isPicked && (
        <Txt variant="label" style={{ color: x.day.link }}>
          {vi.mobile.tripPlan.picked}
        </Txt>
      )}
      {!isOpen && (
        <FlightTimeline
          airline={flight.airline}
          airlineCode={flight.airlineCode}
          baggage={[
            fare?.carryOnKg != null ? t('flights.carryOn', { kg: fare.carryOnKg }) : '',
            fare?.checkedKg != null ? t('flights.checked', { kg: fare.checkedKg }) : '',
          ].filter(Boolean)}
          flightNumber={flight.flightNumber}
          cabinName={cabin.cabinName}
          fromAirport={flight.fromAirport}
          toAirport={flight.toAirport}
          departTime={flight.departTime}
          arriveTime={flight.arriveTime}
          durationMinutes={getFlightDurationMinutes(flight)}
          tags={tags}
        />
      )}
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
                <Txt variant="small" style={ui.muted}>
                  {copy.taxIncluded}
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
          {/* Dải đầu tấm vé như web: logo hãng, loại vé, thu gọn. */}
          <View style={ticketStyles.band}>
            <View style={ticketStyles.logoPill}>
              <FlightAirlineMark airline={flight.airline} airlineCode={flight.airlineCode} />
            </View>
            <Txt style={ticketStyles.bandTag} numberOfLines={1}>
              {copy.oneWay + ' · ' + cabin.cabinName}
            </Txt>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [ticketStyles.collapse, pressed && { opacity: 0.7 }]}
            >
              <Txt style={ticketStyles.collapseText}>{copy.close}</Txt>
              <Icon name="chevron-up" size={14} color={x.brand.white} />
            </Pressable>
          </View>
          <View style={ticketStyles.zigzag} aria-hidden>
            {Array.from({ length: 40 }, (_, index) => (
              <View key={index} style={ticketStyles.tooth} />
            ))}
          </View>
          <View style={ticketStyles.section}>
            {isPicked && (
              <Txt variant="label" style={{ color: x.day.link }}>
                {vi.mobile.tripPlan.picked}
              </Txt>
            )}
            <Row style={{ alignItems: 'flex-start', gap: spacing.sm }}>
              <View>
                <Txt style={ticketStyles.code}>{flight.fromAirport}</Txt>
                <Txt variant="small" style={ui.muted}>
                  {airportCity(flight.fromAirport)}
                </Txt>
                <Txt style={ticketStyles.time}>{flight.departTime?.slice(0, 5) ?? '--:--'}</Txt>
              </View>
              <View style={[ui.flex, { alignItems: 'center', gap: 2, paddingTop: spacing.sm }]}>
                {getFlightDurationMinutes(flight) != null && (
                  <Txt variant="small" style={{ fontFamily: nativeFonts.semibold }}>
                    {formatFlightDuration(getFlightDurationMinutes(flight)!)}
                  </Txt>
                )}
                <View style={ticketStyles.planeDot}>
                  <Icon name="airplane" size={14} color={x.action.primary} />
                </View>
                <Txt variant="small" style={{ color: x.day.link, fontFamily: nativeFonts.semibold }}>
                  {copy.direct}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt style={ticketStyles.code}>{flight.toAirport}</Txt>
                <Txt variant="small" style={ui.muted}>
                  {airportCity(flight.toAirport)}
                </Txt>
                <Txt style={ticketStyles.time}>{flight.arriveTime?.slice(0, 5) ?? '--:--'}</Txt>
              </View>
            </Row>
            <View style={ticketStyles.facts}>
              {[
                [copy.factFlight, flight.flightNumber ?? flight.flightKey],
                [copy.factDate, formatDate(date)],
                [copy.factDepart, flight.departTime?.slice(0, 5) ?? '--:--'],
                [copy.cabin, cabin.cabinName],
                [
                  copy.factPassengers,
                  String(passengerMix.adults + passengerMix.children + passengerMix.infants),
                ],
              ].map(([label, value]) => (
                <View key={label} style={ticketStyles.fact}>
                  <Txt style={ticketStyles.factLabel}>{label}</Txt>
                  <Txt style={ticketStyles.factValue}>{value}</Txt>
                </View>
              ))}
            </View>
          </View>
          <View style={ticketStyles.section}>
            <Txt style={ticketStyles.sectionTitle}>{copy.pickCabin}</Txt>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {cabins.map((offer) => {
                const isSelected = offer.productId === cabin.productId;
                return (
                  <Pressable
                    key={offer.productId}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    disabled={isLocked}
                    onPress={() => {
                      setProductId(offer.productId);
                      setFareCode('');
                    }}
                    style={[ticketStyles.cabinTab, isSelected && ticketStyles.cabinTabSelected]}
                  >
                    <Row style={{ gap: 4, alignItems: 'center' }}>
                      <Icon
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={isSelected ? x.day.link : x.day.textSecondary}
                      />
                      <Txt style={ticketStyles.cabinName}>{offer.cabinName}</Txt>
                    </Row>
                    <Txt variant="small" style={ui.muted}>
                      {offer.isAvailable && offer.priceFrom != null
                        ? money(offer.priceFrom)
                        : getReason(offer)}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
            {cabin.isAvailable && cabin.fares.length > 0 && (
              <>
                <Txt style={ticketStyles.sectionTitle}>{copy.pickFare}</Txt>
                <View style={ticketStyles.fares}>
                  {cabin.fares.map((option, index) => {
                    const isSelected = option.code === fare?.code;
                    return (
                      <Pressable
                        key={option.code}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        disabled={isLocked}
                        onPress={() => setFareCode(option.code)}
                        style={[
                          ticketStyles.fare,
                          index > 0 && ticketStyles.fareDivider,
                          isSelected && ticketStyles.fareSelected,
                        ]}
                      >
                        <View style={[ticketStyles.radio, isSelected && ticketStyles.radioOn]}>
                          {isSelected && <View style={ticketStyles.radioDot} />}
                        </View>
                        <View style={[ui.flex, { gap: 4 }]}>
                          <Txt style={ticketStyles.fareName}>{option.name}</Txt>
                          <Txt
                            style={[
                              ticketStyles.fareNote,
                              !option.isRefundable && { color: x.day.textSecondary },
                            ]}
                          >
                            {option.isRefundable && option.freeCancelDays > 0
                              ? t('flights.freeCancel', { count: option.freeCancelDays })
                              : option.isRefundable
                                ? vi.commerce.refundable
                                : vi.commerce.nonRefundable}
                          </Txt>
                          <Row style={{ gap: 4, flexWrap: 'wrap' }}>
                            {option.carryOnKg != null && (
                              <Txt style={ticketStyles.chip}>
                                {t('flights.carryOn', { kg: option.carryOnKg })}
                              </Txt>
                            )}
                            {option.checkedKg != null && (
                              <Txt style={ticketStyles.chip}>
                                {t('flights.checked', { kg: option.checkedKg })}
                              </Txt>
                            )}
                          </Row>
                        </View>
                        {option.pricePerPerson != null && (
                          <Txt style={ticketStyles.farePrice}>{money(option.pricePerPerson)}</Txt>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
          {/* Đường xé vé: nét đứt với hai lỗ khuyết hai bên như tấm vé trên web. */}
          <View style={ticketStyles.perforation} aria-hidden>
            <View style={[ticketStyles.notch, { left: -10 }]} />
            <View style={ticketStyles.perforationLine} />
            <View style={[ticketStyles.notch, { right: -10 }]} />
          </View>
          <View style={ticketStyles.stub}>
            {canBook ? (
              <>
                <Txt variant="small" style={ui.muted}>
                  {vi.commerce.total}
                </Txt>
                <Txt style={ticketStyles.total}>
                  {money(totalPrice).replace('đ', '')}
                  <Txt style={ticketStyles.currency}> VNĐ</Txt>
                </Txt>
                <Txt variant="small" style={ui.muted}>
                  {t('flights.perPassenger', { price: money(unitPrice) })} · {copy.taxIncluded}
                  {passengerMix.children > 0 && fare.childPrice != null
                    ? ' · ' + copy.passengerTypes.child.label + ' ' + money(fare.childPrice)
                    : ''}
                  {passengerMix.infants > 0 && fare.infantPrice != null
                    ? ' · ' + copy.passengerTypes.infant.label + ' ' + money(fare.infantPrice)
                    : ''}
                </Txt>
                <View style={ticketStyles.stubRows}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="small" style={ui.muted}>
                      {copy.fare}
                    </Txt>
                    <Txt variant="small" style={{ fontFamily: nativeFonts.semibold }}>
                      {fare.name.split(' · ')[0]}
                    </Txt>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="small" style={ui.muted}>
                      {copy.factRefund}
                    </Txt>
                    <Txt variant="small" style={{ fontFamily: nativeFonts.semibold }}>
                      {fare.isRefundable
                        ? fare.freeCancelDays > 0
                          ? t('flights.refundBefore', { count: fare.freeCancelDays })
                          : copy.refundable
                        : copy.noRefund}
                    </Txt>
                  </Row>
                </View>
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
            {cabin.remaining != null && (
              <Txt variant="small" style={[ui.muted, { textAlign: 'center' }]}>
                {t('flights.remaining', { count: cabin.remaining })}
              </Txt>
            )}
            <View style={ticketStyles.barcode} aria-hidden>
              {BARCODE.map((width, index) => (
                <View
                  key={index}
                  style={{
                    width,
                    alignSelf: 'stretch',
                    backgroundColor: index % 2 ? 'transparent' : x.day.text,
                  }}
                />
              ))}
            </View>
            <Txt style={ticketStyles.barcodeText}>{flight.flightNumber ?? flight.flightKey}</Txt>
          </View>
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
    backgroundColor: x.day.tintWarm,
  },
  price: { fontSize: 22, lineHeight: 28, fontFamily: nativeFonts.bold, color: x.day.text },
});

/** Tên thành phố của sân bay ("Hà Nội · Nội Bài" → "Hà Nội"). */
const airportCity = (code: string) => (airportNames[code] ?? code).split(' · ')[0];

const ticketStyles = StyleSheet.create({
  card: { padding: 0, gap: 0, overflow: 'hidden' },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: x.day.link,
  },
  logoPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: x.day.surface,
  },
  bandTag: {
    flex: 1,
    ...typeStyle('caption'),
    fontFamily: nativeFonts.semibold,
    color: x.brand.white,
  },
  collapse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: x.day.surface,
  },
  collapseText: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold, color: x.brand.white },
  section: { gap: spacing.md, padding: spacing.md },
  zigzag: { flexDirection: 'row', height: 6, marginTop: -3, overflow: 'hidden' },
  tooth: {
    width: 10,
    height: 10,
    marginTop: -6,
    backgroundColor: x.day.link,
    transform: [{ rotate: '45deg' }],
  },
  perforation: { height: 20, justifyContent: 'center' },
  perforationLine: {
    marginHorizontal: spacing.md,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderTopColor: x.day.line,
  },
  notch: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.canvas,
  },
  fareNote: { ...typeStyle('caption'), fontFamily: nativeFonts.regular, color: x.day.link },
  currency: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold, color: x.day.textSecondary },
  barcode: { flexDirection: 'row', height: 36, alignSelf: 'center', marginTop: spacing.sm },
  barcodeText: { ...typeStyle('caption'), textAlign: 'center', color: x.day.textSecondary, letterSpacing: 2 },
  code: { fontSize: 32, lineHeight: 38, fontFamily: nativeFonts.bold, color: x.day.text },
  time: { fontSize: 20, lineHeight: 26, fontFamily: nativeFonts.bold, color: x.day.link },
  planeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintWarm,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: x.day.line,
  },
  fact: { width: '33.33%', gap: 2 },
  factLabel: {
    ...typeStyle('caption'),
    fontFamily: nativeFonts.semibold,
    color: x.day.textSecondary,
    letterSpacing: 0.4,
  },
  factValue: { ...typeStyle('label'), fontFamily: nativeFonts.semibold, color: x.day.text },
  sectionTitle: { ...typeStyle('caption'), fontFamily: nativeFonts.semibold, color: x.day.textSecondary },
  // Ô có viền, chọn thì nền xanh và dấu tích: nhìn ra là lựa chọn, không phải thông tin cố định của vé.
  cabinTab: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  cabinTabSelected: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  cabinName: { ...typeStyle('label'), fontFamily: nativeFonts.semibold, color: x.day.text },
  fares: { borderRadius: radius.lg, borderWidth: 1, borderColor: x.day.line, overflow: 'hidden' },
  fare: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  fareDivider: { borderTopWidth: 1, borderTopColor: x.day.line },
  fareSelected: { backgroundColor: x.day.tintExplore },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: x.day.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: x.day.link },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: x.day.link },
  fareName: { ...typeStyle('label'), fontFamily: nativeFonts.semibold, color: x.day.text },
  chip: {
    ...typeStyle('micro'),
    fontFamily: nativeFonts.semibold,
    color: x.day.link,
    backgroundColor: x.day.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  farePrice: { ...typeStyle('label'), fontFamily: nativeFonts.bold, color: x.day.text },
  stub: { gap: spacing.xs, padding: spacing.md, paddingTop: spacing.xs },
  total: { fontSize: 26, lineHeight: 32, fontFamily: nativeFonts.bold, color: x.day.text },
  stubRows: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: x.day.line,
  },
});

/** Độ rộng vạch và khe của mã vạch trang trí ở cuống vé. */
const BARCODE = [
  2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 2, 3, 1, 1, 2,
  1, 1, 2, 1, 3, 1, 2, 2, 1, 1, 2, 3, 1, 1, 2, 1, 1, 2, 2, 1, 3, 1, 1, 2,
];
