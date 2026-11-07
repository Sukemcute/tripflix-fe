'use client';

import { useMutation } from '@tanstack/react-query';
import {
  buildFlightCheckout,
  createCheckoutOperation,
  useApiSession,
  useFlightOffers,
  type FlightSearch,
} from '@tripflix/api-client';
import type { FlightOfferDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { CheckoutError } from '@/features/checkout/checkout-error';
import { formatPrice } from '@/features/discovery/trip-card';
import { addStayDays, MAX_STAY_GUESTS } from '@/features/discovery/stay-search-validation';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { FlightDateStrip } from './flight-date-strip';
import { FlightIcon } from './flight-icon';
import { toAirportOption } from './flight-search-form';
import styles from './flights.module.css';

const copy = vi.flights;
const SORT_OPTIONS = [
  ['recommended', copy.sortRecommended],
  ['price', copy.sortPrice],
  ['departure', copy.sortDeparture],
  ['duration', copy.sortDuration],
] as const;
const getReason = (offer: FlightOfferDto) => (offer.reason ? copy.reasons[offer.reason] : copy.unavailable);
const amountFormatter = new Intl.NumberFormat('vi-VN');
const formatAmount = (amount: number) => amountFormatter.format(amount);
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatFlightDate(isoDate: string): string {
  const text = dateFormatter.format(new Date(isoDate + 'T00:00:00Z'));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Ưu tiên số phút BE trả; thiếu thì tính từ giờ đi, giờ đến (qua nửa đêm thì cộng một ngày). */
function formatDuration(
  flight: Pick<FlightOfferDto, 'durationMinutes' | 'departTime' | 'arriveTime'>,
): string | null {
  const { durationMinutes, departTime, arriveTime } = flight;
  if (durationMinutes == null && (!departTime || !arriveTime)) return null;
  const totalMinutes =
    durationMinutes ?? (toMinutes(arriveTime ?? '') - toMinutes(departTime ?? '') + 24 * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? t('flights.duration', { hours, minutes }) : t('flights.durationHours', { hours });
}

/** Hãng có logo trong public/airlines/<mã IATA>.png. */
const AIRLINE_LOGOS = new Set(['VN', 'VJ', 'VU', 'QH', 'BL']);
const AIRLINE_NAME_CODES: [RegExp, string][] = [
  [/vietnam airlines/i, 'VN'],
  [/vietjet/i, 'VJ'],
  [/vietravel/i, 'VU'],
  [/bamboo/i, 'QH'],
  [/pacific/i, 'BL'],
];

/** Mã IATA của hãng: lấy từ BE, thiếu (dữ liệu cũ) thì đoán theo tên hãng. */
function resolveAirlineCode(flight: Pick<FlightOfferDto, 'airlineCode' | 'airline'>): string | null {
  if (flight.airlineCode) return flight.airlineCode.toUpperCase();
  const match = AIRLINE_NAME_CODES.find(([pattern]) => pattern.test(flight.airline ?? ''));
  return match?.[1] ?? null;
}

function AirlineLogo({ code, airline }: { code: string | null; airline: string | null }) {
  return (
    <span
      className={styles.airlineBadge}
      data-logo={(code && AIRLINE_LOGOS.has(code)) || undefined}
      aria-hidden="true"
    >
      {code && AIRLINE_LOGOS.has(code) ? (
        <Image src={'/airlines/' + code + '.png'} alt="" width={64} height={64} />
      ) : (
        (code ?? getAirlineInitials(airline))
      )}
    </span>
  );
}

function getAirlineInitials(airline: string | null): string {
  const words = (airline ?? '')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length > 1
      ? words
          .slice(0, 2)
          .map((word) => word.charAt(0))
          .join('')
      : (words[0] ?? '').slice(0, 2);
  return initials.toUpperCase() || '✈';
}

/** Giữ chỗ một hạng ghế rồi chuyển sang trang thanh toán. Chỉ cần ngày bay và số khách của lượt tìm. */
export function useFlightHold(search: FlightSearch) {
  const router = useRouter();
  const [create] = useState(createCheckoutOperation);
  return useMutation({
    mutationFn: ({ productId, fareCode }: { productId: string; fareCode: string; flightKey: string }) =>
      create(buildFlightCheckout(search, productId, fareCode)),
    retry: false,
    onSuccess: ({ orderId }) => router.push('/checkout/' + encodeURIComponent(orderId)),
  });
}

/** Đánh dấu chuyến rẻ nhất và bay nhanh nhất; chỉ khi có từ 2 chuyến để so sánh. */
function getHighlights(flights: FlightOfferDto[][]) {
  const tags = new Map<string, { label: string; tone: 'coral' | 'teal' }[]>();
  if (flights.length < 2) return tags;
  const add = (flightKey: string | undefined, label: string, tone: 'coral' | 'teal') => {
    if (flightKey) tags.set(flightKey, [...(tags.get(flightKey) ?? []), { label, tone }]);
  };
  const pickMin = (score: (cabins: FlightOfferDto[]) => number | null) => {
    const scored = flights
      .map((cabins) => ({ key: cabins[0]?.flightKey, value: score(cabins) }))
      .filter(
        (item): item is { key: string; value: number } => item.key !== undefined && item.value !== null,
      );
    const best = Math.min(...scored.map((item) => item.value));
    const winners = scored.filter((item) => item.value === best);
    // Nhiều chuyến bằng nhau thì không có gì nổi bật để đánh dấu.
    return winners.length === 1 ? winners[0]?.key : undefined;
  };
  add(
    pickMin((cabins) => {
      const prices = cabins.flatMap((offer) =>
        offer.isAvailable && offer.priceFrom != null ? [offer.priceFrom] : [],
      );
      return prices.length ? Math.min(...prices) : null;
    }),
    copy.cheapest,
    'coral',
  );
  add(
    pickMin((cabins) => cabins[0]?.durationMinutes ?? null),
    copy.fastest,
    'teal',
  );
  return tags;
}

interface FlightResultsProps {
  search: FlightSearch;
  initialProductId: string;
  initialFareCode: string;
}

export function FlightResults(props: FlightResultsProps) {
  const { user } = useApiSession();
  return <Results key={user?.id ?? 'guest'} {...props} />;
}

function Results({ search, initialProductId, initialFareCode }: FlightResultsProps) {
  const { user, isReady } = useApiSession();
  const query = useFlightOffers(search);
  const hold = useFlightHold(search);
  const params = new URLSearchParams({ ...search, passengers: String(search.passengers) });
  const detailQuery = new URLSearchParams({
    date: search.date,
    passengers: String(search.passengers),
  }).toString();
  const fromCity = toAirportOption(search.from).city;
  const toCity = toAirportOption(search.to).city;
  const destination = query.data?.[0]?.[0]?.destination;
  const highlights = getHighlights(query.data ?? []);

  return (
    <section aria-labelledby="flight-results" className={styles.results}>
      <header className={styles.resultsHeader}>
        <div>
          <p className="eyebrow">
            {fromCity} → {toCity}
          </p>
          <h2 id="flight-results">{t('flights.results', { from: search.from, to: search.to })}</h2>
        </div>
        <div className={styles.resultsMeta}>
          <span>
            <FlightIcon name="calendar" size={16} />
            {formatFlightDate(search.date)}
          </span>
          <span>
            <FlightIcon name="users" size={16} />
            {t('flights.passengers', { count: search.passengers })}
          </span>
          {query.data && query.data.length > 0 && (
            <span className={styles.countChip}>
              {t('flights.resultsCount', { count: query.data.length })}
            </span>
          )}
        </div>
      </header>
      <FlightDateStrip search={search} />
      <nav className={styles.sortBar} aria-label={copy.sortLabel}>
        <span>{copy.sortLabel}</span>
        {SORT_OPTIONS.map(([value, label]) => {
          const sortParams = new URLSearchParams(params);
          if (value === 'recommended') sortParams.delete('sort');
          else sortParams.set('sort', value);
          return (
            <Link
              key={value}
              href={'/flights?' + sortParams}
              scroll={false}
              aria-current={(search.sort ?? 'recommended') === value ? 'true' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {query.isPending && (
        <output className={styles.loadingState}>
          <Image src="/brand/tripi-library/ui-searching.png" alt="" width={88} height={88} />
          <span>{copy.loadingFlights}</span>
        </output>
      )}
      <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.data?.length === 0 && (
        <output className={styles.loadingState}>
          <Image src="/brand/tripi-library/expr-curious.png" alt="" width={88} height={88} />
          <span>{copy.empty}</span>
        </output>
      )}
      {query.data?.map(
        ([first, ...otherCabins]) =>
          first && (
            <FlightCard
              key={first.flightKey}
              flight={first}
              cabins={[first, ...otherCabins]}
              isLocked={!isReady || hold.isPending || hold.isSuccess}
              isHolding={hold.isPending && hold.variables?.flightKey === first.flightKey}
              returnTo={user ? undefined : '/flights?' + params}
              initialProductId={initialProductId}
              initialFareCode={initialFareCode}
              detailQuery={detailQuery}
              tags={highlights.get(first.flightKey)}
              date={search.date}
              passengers={search.passengers}
              onHold={(productId, fareCode) =>
                hold.mutate({ productId, fareCode, flightKey: first.flightKey })
              }
              error={hold.variables?.flightKey === first.flightKey ? hold.error : null}
            />
          ),
      )}
      {destination && <StaySuggestion destination={destination} search={search} />}
    </section>
  );
}

export function StaySuggestion({
  destination,
  search,
}: {
  destination: FlightOfferDto['destination'];
  search: FlightSearch;
}) {
  return (
    <aside className={styles.staySuggestion}>
      <Image src="/brand/hotel.jpg" alt="" width={96} height={72} className={styles.stayPhoto} />
      <div className={styles.stayText}>
        <strong>{t('flights.stayTitle', { place: destination.name })}</strong>
        <span>{copy.stayText}</span>
      </div>
      <Link
        className={'ripple-button ' + styles.stayLink}
        href={
          '/search?' +
          new URLSearchParams({
            placeId: destination.slug,
            checkIn: search.date,
            checkOut: addStayDays(search.date, 2),
            adults: String(Math.min(search.passengers, MAX_STAY_GUESTS)),
          })
        }
      >
        {copy.stayCta}
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}

export function FlightCard({
  flight,
  cabins,
  isLocked,
  isHolding,
  returnTo,
  initialProductId,
  initialFareCode,
  detailQuery,
  isInitiallyOpen = false,
  tags = [],
  date,
  passengers,
  onHold,
  error,
}: {
  flight: FlightOfferDto;
  cabins: FlightOfferDto[];
  isLocked: boolean;
  isHolding: boolean;
  returnTo?: string;
  initialProductId: string;
  initialFareCode: string;
  /** Có thì tên hãng thành link tới /flights/:id; bỏ trống ở chính trang chi tiết. */
  detailQuery?: string;
  /** Mở sẵn phần chọn vé, ví dụ ở trang chi tiết. */
  isInitiallyOpen?: boolean;
  /** Nhãn nổi trên góc thẻ, ví dụ "Rẻ nhất", "Bay nhanh nhất". */
  tags?: { label: string; tone: 'coral' | 'teal' }[];
  /** Ngày bay YYYY-MM-DD và số khách, in ở hàng thông tin của vé khi mở. */
  date: string;
  passengers: number;
  onHold: (productId: string, fareCode: string) => void;
  error: unknown;
}) {
  const bodyId = useId();
  const initialCabin = cabins.find((offer) => offer.productId === initialProductId);
  const [isOpen, setIsOpen] = useState(isInitiallyOpen || initialCabin !== undefined);
  const [productId, setProductId] = useState(initialCabin?.productId ?? flight.productId);
  const [fareCode, setFareCode] = useState(initialCabin ? initialFareCode : '');
  const cabin = cabins.find((offer) => offer.productId === productId) ?? flight;
  const fare = cabin.fares.find((option) => option.code === fareCode) ?? cabin.fares[0];
  const totalPrice = fare?.totalPrice;
  const unitPrice = fare?.pricePerPerson;
  const canBook = cabin.isAvailable && fare !== undefined && totalPrice != null && unitPrice != null;
  const duration = formatDuration(flight);
  const origin = toAirportOption(flight.fromAirport);
  const destination = toAirportOption(flight.toAirport, flight.destination.name);
  const fareGroup = 'fare-' + flight.flightKey;
  const flightCode = flight.flightNumber ?? flight.flightKey;
  // Giá "từ" của cả chuyến: rẻ nhất trong các hạng còn bán.
  const cheapest = cabins
    .filter((offer) => offer.isAvailable && offer.priceFrom != null)
    .sort((a, b) => (a.priceFrom ?? 0) - (b.priceFrom ?? 0))[0];
  const cheapestFare = cheapest?.fares.find((option) => option.pricePerPerson === cheapest.priceFrom);
  const airlineName = flight.airline ?? flight.name;
  const airlineCode = resolveAirlineCode(flight);

  return (
    <article
      className={styles.card}
      aria-label={flight.name}
      data-open={isOpen || undefined}
      data-airline={airlineCode ?? undefined}
    >
      {tags.length > 0 && (
        <div className={styles.cardTags}>
          {tags.map((tag) => (
            <span key={tag.label} data-tone={tag.tone}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
      {!isOpen && (
        <div className={styles.row}>
          <div className={styles.airline}>
            <AirlineLogo code={airlineCode} airline={flight.airline} />
            <div>
              <h3>
                {detailQuery ? (
                  <Link
                    className={styles.detailLink}
                    href={'/flights/' + encodeURIComponent(cabin.productId) + '?' + detailQuery}
                    title={copy.viewDetail}
                  >
                    {airlineName}
                  </Link>
                ) : (
                  airlineName
                )}
              </h3>
              <p>
                <span className={styles.flightCode}>{flightCode}</span>
                <span>{cabin.cabinName}</span>
              </p>
            </div>
          </div>
          <div className={styles.timeline}>
            <div className={styles.stop}>
              <strong>{flight.departTime?.slice(0, 5) ?? '--:--'}</strong>
              <span title={origin.city}>{flight.fromAirport}</span>
            </div>
            <div className={styles.path}>
              {duration && <span className={styles.duration}>{duration}</span>}
              <span className={styles.pathLine} aria-hidden="true">
                <FlightIcon name="plane" size={16} />
              </span>
              <span className={styles.direct} data-stops={flight.stops > 0 || undefined}>
                {flight.stops > 0 ? t('flights.stops', { count: flight.stops }) : copy.direct}
              </span>
            </div>
            <div className={styles.stop + ' ' + styles.stopEnd}>
              <strong>{flight.arriveTime?.slice(0, 5) ?? '--:--'}</strong>
              <span title={destination.city}>{flight.toAirport}</span>
            </div>
          </div>
          <BaggageInfo fare={cheapestFare ?? fare} />
          <div className={styles.rowPrice}>
            {cheapest?.priceFrom != null ? (
              <>
                <span className={styles.rowPriceLabel}>{copy.priceFrom}</span>
                <strong>
                  {formatAmount(cheapest.priceFrom)} <small>₫{copy.perPerson}</small>
                </strong>
                {flight.isPriceTaxIncluded && <span className={styles.rowPriceNote}>{copy.taxIncluded}</span>}
              </>
            ) : (
              <span className={styles.rowPriceNote}>{getReason(flight)}</span>
            )}
            <button
              type="button"
              className={'ripple-button ' + styles.toggleButton}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? copy.close : copy.open}
              <FlightIcon name="chevron" size={16} />
            </button>
          </div>
        </div>
      )}
      {isOpen && (
        <div id={bodyId} className={styles.cardBody}>
          <div className={styles.cardMain}>
            <div className={styles.tBand}>
              <AirlineLogo code={airlineCode} airline={flight.airline} />
              <h3>
                {detailQuery ? (
                  <Link
                    className={styles.detailLink}
                    href={'/flights/' + encodeURIComponent(cabin.productId) + '?' + detailQuery}
                    title={copy.viewDetail}
                  >
                    {airlineName}
                  </Link>
                ) : (
                  airlineName
                )}
              </h3>
              <span className={styles.tTag}>
                {copy.oneWay} · {cabin.cabinName}
              </span>
              {!isInitiallyOpen && (
                <button
                  type="button"
                  className={'ripple-button ' + styles.tClose}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  onClick={() => setIsOpen(false)}
                >
                  {copy.close}
                  <FlightIcon name="chevron" size={16} />
                </button>
              )}
            </div>
            <div className={styles.tBody}>
              <div className={styles.tTimeline}>
                <div className={styles.tStop}>
                  <strong>{flight.fromAirport}</strong>
                  <span>{origin.city}</span>
                  <b>{flight.departTime?.slice(0, 5) ?? '--:--'}</b>
                </div>
                <div className={styles.tPath}>
                  {duration && <span>{duration}</span>}
                  <span className={styles.tLine} aria-hidden="true">
                    <span className={styles.tPlane}>
                      <FlightIcon name="plane" size={18} />
                    </span>
                  </span>
                  <span className={styles.direct} data-stops={flight.stops > 0 || undefined}>
                    {flight.stops > 0 ? t('flights.stops', { count: flight.stops }) : copy.direct}
                  </span>
                </div>
                <div className={styles.tStop + ' ' + styles.tStopEnd}>
                  <strong>{flight.toAirport}</strong>
                  <span>{destination.city}</span>
                  <b>{flight.arriveTime?.slice(0, 5) ?? '--:--'}</b>
                </div>
              </div>
              <dl className={styles.tFacts}>
                <div>
                  <dt>{copy.factFlight}</dt>
                  <dd>{flightCode}</dd>
                </div>
                <div>
                  <dt>{copy.factDate}</dt>
                  <dd>{date.slice(8, 10) + '/' + date.slice(5, 7) + '/' + date.slice(0, 4)}</dd>
                </div>
                <div>
                  <dt>{copy.factDepart}</dt>
                  <dd>{flight.departTime?.slice(0, 5) ?? '--:--'}</dd>
                </div>
                <div>
                  <dt>{copy.cabin}</dt>
                  <dd>{cabin.cabinName}</dd>
                </div>
                <div>
                  <dt>{copy.factPassengers}</dt>
                  <dd>{passengers}</dd>
                </div>
              </dl>
            </div>
            <div className={styles.options}>
              <fieldset className={styles.optionGroup} disabled={isLocked}>
                <legend>{copy.pickCabin}</legend>
                <div className={styles.cabinTabs}>
                  {cabins.map((offer) => (
                    <button
                      key={offer.productId}
                      type="button"
                      aria-pressed={offer.productId === cabin.productId}
                      data-unavailable={!offer.isAvailable || undefined}
                      onClick={() => {
                        setProductId(offer.productId);
                        setFareCode('');
                      }}
                    >
                      <span>{offer.cabinName}</span>
                      <small>
                        {offer.isAvailable && offer.priceFrom != null
                          ? formatAmount(offer.priceFrom) + ' ₫'
                          : getReason(offer)}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
              {cabin.isAvailable && cabin.fares.length > 0 && (
                <fieldset className={styles.optionGroup} disabled={isLocked}>
                  <legend>{copy.pickFare}</legend>
                  <div className={styles.fareList}>
                    {cabin.fares.map((option) => (
                      <label key={option.code} className={styles.fareRow}>
                        <input
                          type="radio"
                          name={fareGroup}
                          value={option.code}
                          checked={option.code === fare?.code}
                          onChange={() => setFareCode(option.code)}
                        />
                        <span className={styles.fareText}>
                          <span className={styles.fareName}>{option.name}</span>
                          <span
                            className={styles.farePolicy}
                            data-refundable={option.isRefundable || undefined}
                          >
                            {option.isRefundable && option.freeCancelDays > 0
                              ? t('flights.freeCancel', { count: option.freeCancelDays })
                              : option.isRefundable
                                ? copy.refundable
                                : vi.commerce.nonRefundable}
                          </span>
                        </span>
                        <BaggageInfo fare={option} />
                        {option.pricePerPerson != null && (
                          <span className={styles.farePrice}>{formatAmount(option.pricePerPerson)} ₫</span>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          </div>
          <aside className={styles.stub}>
            <div className={styles.stubBand}>
              <span>{copy.stubLabel}</span>
              <span>
                {flightCode} · {flight.fromAirport} → {flight.toAirport}
              </span>
            </div>
            {canBook ? (
              <div className={styles.stubPrice}>
                <span className={styles.stubLabel}>{vi.commerce.total}</span>
                <p className={styles.amount}>
                  <strong>{formatAmount(totalPrice)}</strong>
                  <span>VNĐ</span>
                </p>
                <span className={styles.stubNote}>
                  {t('flights.perPassenger', { price: formatPrice(unitPrice) })}
                  {flight.isPriceTaxIncluded && ' · ' + copy.taxIncluded}
                </span>
              </div>
            ) : (
              <p className={styles.stubNote}>{getReason(cabin)}</p>
            )}
            {canBook && (
              <dl className={styles.stubFacts}>
                <div>
                  <dt>{copy.fare}</dt>
                  <dd>{fare.name.split(' · ')[0]}</dd>
                </div>
                <div>
                  <dt>{copy.factRefund}</dt>
                  <dd data-refundable={fare.isRefundable || undefined}>
                    {fare.isRefundable
                      ? fare.freeCancelDays > 0
                        ? t('flights.refundBefore', { count: fare.freeCancelDays })
                        : copy.refundable
                      : copy.noRefund}
                  </dd>
                </div>
              </dl>
            )}
            <div className={styles.stubActions}>
              {canBook && !isLocked && returnTo ? (
                <Link
                  className={'ripple-button ' + styles.bookButton}
                  href={
                    '/login?returnTo=' +
                    encodeURIComponent(
                      returnTo +
                        '&' +
                        new URLSearchParams({ productId: cabin.productId, ratePlanCode: fare.code }),
                    )
                  }
                >
                  {vi.commerce.login}
                </Link>
              ) : (
                <button
                  type="button"
                  className={'ripple-button ' + styles.bookButton}
                  disabled={isLocked || !canBook}
                  onClick={() => fare && onHold(cabin.productId, fare.code)}
                >
                  {isHolding ? vi.api.loading : copy.choose}
                </button>
              )}
              {canBook && cabin.remaining != null && (
                <span className={styles.remaining} data-low={cabin.remaining <= 10 || undefined}>
                  {t('flights.remaining', { count: cabin.remaining })}
                </span>
              )}
              <CheckoutError error={error} />
            </div>
            <div className={styles.barcode} aria-hidden="true">
              <span />
              <small>{flightCode}</small>
            </div>
          </aside>
        </div>
      )}
    </article>
  );
}

/** Hành lý mỗi khách của một gói vé; ẩn khi BE chưa có số liệu. */
function BaggageInfo({ fare }: { fare: FlightOfferDto['fares'][number] | undefined }) {
  if (!fare || (fare.carryOnKg == null && fare.checkedKg == null)) return null;
  return (
    <span className={styles.baggage}>
      {fare.carryOnKg != null && <span>{t('flights.carryOn', { kg: fare.carryOnKg })}</span>}
      {fare.checkedKg != null && (
        <span data-none={fare.checkedKg === 0 || undefined}>
          {fare.checkedKg > 0 ? t('flights.checked', { kg: fare.checkedKg }) : copy.noChecked}
        </span>
      )}
    </span>
  );
}
