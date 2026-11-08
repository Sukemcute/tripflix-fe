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
import { t, vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import {
  Button,
  Card,
  Chip,
  Field,
  Icon,
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
import { CommerceError } from '@/features/booking/commerce-state';

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
type HoldSelection = { search: FlightSearch; flightKey: string; productId: string; fareCode: string };

export function FlightSearchScreen() {
  const params = useLocalSearchParams();
  const read = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : '';
  };
  const initial = {
    from: read('from'),
    to: read('to'),
    date: read('date'),
    passengers: read('passengers') || '1',
    children: read('children'),
    infants: read('infants'),
  };
  const search = parseFlightSearch(initial);
  const [draft, setDraft] = useState({ ...initial, date: search?.date ?? getFlightToday() });
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
    <Screen title={copy.title}>
      <Txt variant="title">{copy.title}</Txt>
      <Txt style={ui.muted}>{copy.intro}</Txt>
      <Card>
        {(['from', 'to'] as const).map((key) => {
          const { label, options } = choices[key];
          const selection = options.find(({ value }) => value === draft[key]);
          return (
            <View key={key} style={{ gap: spacing.xs }}>
              <Txt variant="label">{label}</Txt>
              <Button
                tone="secondary"
                icon="chevron-down"
                disabled={isLocked || !options.length}
                onPress={() => setPicker(key)}
              >
                {selection?.label ??
                  (key === 'to' && !draft.from ? copy.selectOriginFirst : copy.selectAirport)}
              </Button>
            </View>
          );
        })}
        <Field
          label={copy.date}
          placeholder={copy.dateFormat}
          value={draft.date}
          maxLength={10}
          editable={!isLocked}
          onChangeText={(date) => setDraft((previous) => ({ ...previous, date }))}
        />
        <View style={{ gap: spacing.xs }}>
          <Txt variant="label">{copy.adults}</Txt>
          <Button
            tone="secondary"
            icon="chevron-down"
            disabled={isLocked}
            onPress={() => setPicker('passengers')}
          >
            {formatPassengerMix(draftMix)}
          </Button>
        </View>
        <Button
          icon="search-outline"
          disabled={isLocked || !destinations.some(({ value }) => value === draft.to)}
          onPress={submit}
        >
          {copy.search}
        </Button>
        {hasInvalidSearch && <Notice tone="error">{copy.invalidSearch}</Notice>}
        {routes.isPending && <Txt>{vi.api.loading}</Txt>}
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
          isLocked={!isReady || isLocked}
          isSignedIn={!!user}
          onChoose={chooseFlight}
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
  isLocked,
  isSignedIn,
  onChoose,
  holdKey,
  holdError,
  isHolding,
}: {
  search: FlightSearch;
  initialProductId: string;
  initialFareCode: string;
  isLocked: boolean;
  isSignedIn: boolean;
  onChoose: (selection: HoldSelection) => void;
  holdKey?: string;
  holdError: unknown;
  isHolding: boolean;
}) {
  const query = useFlightOffers(search);
  return (
    <>
      <View style={{ gap: spacing.xs }}>
        <Txt variant="heading">{t('flights.results', { from: search.from, to: search.to })}</Txt>
        <Txt variant="small" style={ui.muted}>
          {formatDate(search.date)} · {formatPassengerMix(getFlightPassengerMix(search))}
        </Txt>
      </View>
      {query.isPending && <Txt>{vi.api.loading}</Txt>}
      <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.data?.length === 0 && <Notice>{copy.empty}</Notice>}
      {query.data?.map(
        ([first, ...otherCabins]) =>
          first && (
            <FlightCard
              key={first.flightKey}
              flight={first}
              cabins={[first, ...otherCabins]}
              initialProductId={initialProductId}
              initialFareCode={initialFareCode}
              isLocked={isLocked}
              isHolding={isHolding && holdKey === first.flightKey}
              isSignedIn={isSignedIn}
              passengerMix={getFlightPassengerMix(search)}
              error={holdKey === first.flightKey ? holdError : null}
              onChoose={(productId, fareCode) =>
                onChoose({ search, productId, fareCode, flightKey: first.flightKey })
              }
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
  isLocked,
  isHolding,
  isSignedIn,
  passengerMix,
  onChoose,
  error,
}: {
  passengerMix: FlightPassengerMix;
  flight: FlightOfferDto;
  cabins: FlightOfferDto[];
  initialProductId: string;
  initialFareCode: string;
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
  const timeLabel = (airport: string, time: string | null) =>
    time ? airport + ' · ' + time.slice(0, 5) : airport;
  return (
    <Card>
      <Txt variant="small" style={ui.muted}>
        {flight.airline ? flight.airline + ' · ' + flight.flightKey : flight.flightKey}
      </Txt>
      <Txt variant="heading">{flight.name}</Txt>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Txt variant="label">{timeLabel(flight.fromAirport, flight.departTime)}</Txt>
        <Icon name="airplane-outline" color={colors.tealInk} size={18} />
        <Txt variant="label">{timeLabel(flight.toAirport, flight.arriveTime)}</Txt>
      </Row>
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
      <Button disabled={!canBook || isLocked} onPress={() => fare && onChoose(cabin.productId, fare.code)}>
        {isHolding ? vi.api.loading : canBook && !isSignedIn ? vi.commerce.login : copy.choose}
      </Button>
      <CommerceError error={error} />
    </Card>
  );
}
