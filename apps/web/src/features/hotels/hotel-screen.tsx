'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, HttpError, useApiSession } from '@tripflix/api-client';
import { isValidTripDate, shiftTripDate } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookRateButton } from '@/features/checkout/book-rate-button';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { formatPrice } from '@/features/discovery/trip-card';
import { HotelGallery } from './hotel-gallery';
import { HotelIcon } from './hotel-icon';
import { HotelReviews } from './hotel-reviews';
import styles from './hotel.module.css';

const copy = vi.hotel;
const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';
const getLabel = (labels: Record<string, string>, key: string) => labels[key] ?? key;
type Stay = { checkIn: string; checkOut: string; adults: number };
function isValidStay(stay: Stay): boolean {
  return (
    isValidTripDate(stay.checkIn, shiftTripDate(getFutureDate(0), -1)) &&
    isValidTripDate(stay.checkOut, stay.checkIn) &&
    stay.checkOut > stay.checkIn &&
    Number.isInteger(stay.adults) &&
    stay.adults >= 1 &&
    stay.adults <= 9
  );
}

export function HotelScreen({
  id,
  checkIn,
  checkOut,
  adults,
  resultsHref,
}: {
  id: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  resultsHref?: string;
}) {
  const router = useRouter();
  const { isReady } = useApiSession();
  const initial = {
    checkIn: checkIn ?? getFutureDate(1),
    checkOut: checkOut ?? getFutureDate(3),
    adults: adults === undefined ? 2 : Number(adults),
  };
  const [stay, setStay] = useState<Stay>(
    isValidStay(initial) ? initial : { checkIn: getFutureDate(1), checkOut: getFutureDate(3), adults: 2 },
  );
  const [draft, setDraft] = useState(stay);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const query = useQuery({
    queryKey: ['commerce', 'hotel', id, stay],
    enabled: isReady,
    queryFn: ({ signal }) => commerceApi.getHotel(id, stay, signal),
  });
  const hotel = query.data;
  const isMissing = query.error instanceof HttpError && query.error.status === 404;
  const featured = hotel?.amenities?.filter((amenity) => amenity.featured) ?? [];
  const groups = [...new Set(hotel?.amenities?.map((amenity) => amenity.group) ?? [])];
  const facts = Object.entries(hotel?.facts ?? {}).filter(([, value]) => hasValue(value));
  const policies = Object.entries(hotel?.policies ?? {}).filter(([, value]) => hasValue(value));
  const hasAmenities = groups.length > 0 || facts.length > 0 || !!hotel?.languages?.length;
  const hasPolicies = policies.length > 0 || !!hotel?.checkInTime || !!hotel?.checkOutTime;
  return (
    <main id="content" className={`ota-container ${styles.page}`}>
      <Link href={resultsHref ?? '/search'} className={styles.back}>
        ← {resultsHref ? vi.ota.backToResults : copy.back}
      </Link>
      {isMissing ? (
        <div className="empty-state">
          <h1>{copy.notFound}</h1>
        </div>
      ) : (
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      )}
      {!hotel && !query.error && (
        <div className={styles.skeleton}>
          <output>{copy.loading}</output>
          <div />
          <div />
        </div>
      )}
      {hotel && (
        <>
          <header className={styles.heading}>
            <div>
              <p className="eyebrow">
                {hotel.province.name}
                {hotel.brand && ` · ${hotel.brand}`}
              </p>
              <h1>{hotel.name}</h1>
              {hotel.stars && (
                <p className={styles.stars} aria-label={`${hotel.stars} ★`}>
                  {'★'.repeat(hotel.stars)}
                </p>
              )}
              {hotel.address && (
                <p className={styles.address}>
                  {hotel.address}
                  {hotel.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${hotel.location.lat},${hotel.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {copy.map} ↗
                    </a>
                  )}
                </p>
              )}
              {hotel.rating && (
                <p className={styles.rating}>
                  <strong>
                    {hotel.rating.average.toLocaleString('vi-VN')} {copy.outOfFive}
                  </strong>
                  <span>{t('hotel.reviewCount', { count: hotel.rating.count })}</span>
                  {hotel.rating.source && (
                    <span>
                      {copy.ratingSource}: {hotel.rating.source}
                    </span>
                  )}
                </p>
              )}
            </div>
            {hotel.priceFrom !== null && (
              <div className={styles.headingPrice}>
                <span>{copy.from}</span>
                <strong>{formatPrice(hotel.priceFrom)}</strong>
                <small>{copy.perNight}</small>
                <a href="#rooms" className="primary-button">
                  {copy.chooseRoom}
                </a>
              </div>
            )}
          </header>
          <HotelGallery
            images={hotel.images.length ? hotel.images : hotel.thumbnail ? [hotel.thumbnail] : []}
            name={hotel.name}
          />
          <nav className={styles.sectionNav} aria-label={copy.title}>
            <a href="#overview">{copy.overview}</a>
            <a href="#rooms">{copy.rooms}</a>
            {hasAmenities && <a href="#amenities">{copy.amenities}</a>}
            {hasPolicies && <a href="#policies">{copy.policies}</a>}
            <a href="#reviews">{copy.reviews}</a>
          </nav>
          <div className={styles.overviewGrid} id="overview">
            <div>
              {hotel.description && (
                <section className={styles.section}>
                  <h2>{copy.introduction}</h2>
                  <p className={styles.description}>{hotel.description}</p>
                </section>
              )}
              {!!hotel.highlights?.length && (
                <section className={styles.section}>
                  <h2>{copy.highlights}</h2>
                  <ul className={styles.highlightList}>
                    {hotel.highlights.map((highlight, index) => (
                      <li key={`${highlight.text}-${index}`}>
                        <HotelIcon name={highlight.icon} />
                        <span>{highlight.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {featured.length > 0 && (
                <section className={styles.section}>
                  <h2>{copy.featuredAmenities}</h2>
                  <ul className={styles.featured}>
                    {featured.map((amenity) => (
                      <li key={`${amenity.group}-${amenity.name}`}>
                        <HotelIcon name={amenity.icon} />
                        <span>{amenity.name}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            {!!hotel.nearby?.length && (
              <aside className={styles.nearby}>
                <h2>{copy.nearby}</h2>
                <ul>
                  {hotel.nearby.map((place) => (
                    <li key={place.name}>
                      <span>{place.name}</span>
                      <strong>{place.distanceKm.toLocaleString('vi-VN')} km</strong>
                    </li>
                  ))}
                </ul>
                <small>{copy.mockNearby}</small>
              </aside>
            )}
          </div>
          <section id="rooms" className={styles.section}>
            <h2>{copy.rooms}</h2>
            <form
              className={styles.stayForm}
              onSubmit={(event) => {
                event.preventDefault();
                setHasSubmitted(true);
                if (!isValidStay(draft)) return;
                setStay({ ...draft });
                router.replace(
                  `/hotels/${encodeURIComponent(id)}?${new URLSearchParams({ checkIn: draft.checkIn, checkOut: draft.checkOut, adults: String(draft.adults), ...(resultsHref ? { from: resultsHref } : {}) })}`,
                  { scroll: false },
                );
                if (JSON.stringify(draft) === JSON.stringify(stay)) void query.refetch();
              }}
            >
              <label>
                {copy.checkIn}
                <input
                  type="date"
                  required
                  min={getFutureDate(0)}
                  value={draft.checkIn}
                  onChange={(event) => setDraft({ ...draft, checkIn: event.target.value })}
                />
              </label>
              <label>
                {copy.checkOut}
                <input
                  type="date"
                  required
                  min={shiftTripDate(draft.checkIn || getFutureDate(0), 1)}
                  value={draft.checkOut}
                  onChange={(event) => setDraft({ ...draft, checkOut: event.target.value })}
                />
              </label>
              <label>
                {copy.adults}
                <input
                  type="number"
                  min={1}
                  max={9}
                  required
                  value={draft.adults || ''}
                  onChange={(event) => setDraft({ ...draft, adults: Number(event.target.value) })}
                />
              </label>
              <button className="primary-button" disabled={query.isFetching}>
                {query.isFetching ? vi.common.loading : copy.update}
              </button>
            </form>
            {hasSubmitted && !isValidStay(draft) && (
              <p role="alert" className={styles.formError}>
                {copy.invalidStay}
              </p>
            )}
            <p className="small muted">
              {hotel.stay.checkIn} → {hotel.stay.checkOut} · {hotel.stay.nights} {copy.nights} ·{' '}
              {hotel.stay.adults} {copy.guests}
            </p>
            {query.isFetching && <output>{vi.common.loading}</output>}
            {!hotel.isAvailable && <p className={styles.notice}>{copy.unavailable}</p>}
            {!hotel.rooms.length && <p className="empty-state">{copy.noRooms}</p>}
            <div aria-busy={query.isFetching}>
              {hotel.rooms.map((room) => (
                <article className={styles.room} key={room.productId}>
                  <div className={styles.roomInfo}>
                    <HotelGallery images={room.images ?? []} name={room.name} compact />
                    <h3>{room.name}</h3>
                    <ul className={styles.roomFacts}>
                      {room.areaM2 !== null && room.areaM2 !== undefined && <li>{room.areaM2} m²</li>}
                      {room.bedType && <li>{room.bedType}</li>}
                      {room.view && <li>{getLabel(copy.views, room.view)}</li>}
                      <li>
                        {copy.maxGuests} {room.maxGuests} {copy.guests}
                      </li>
                    </ul>
                    {!!room.amenities?.length && (
                      <ul className={styles.roomAmenities}>
                        {room.amenities.map((amenity) => (
                          <li key={amenity}>
                            <HotelIcon name="check" />
                            {amenity}
                          </li>
                        ))}
                      </ul>
                    )}
                    {room.remaining !== null && (
                      <p className="small muted">
                        {copy.remaining}: {room.remaining}
                      </p>
                    )}
                    <p className="small muted">
                      {copy.roomsNeeded}: {room.roomsNeeded}
                    </p>
                    {!room.isAvailable && (
                      <p className={styles.notice}>
                        {room.reason ? vi.commerce.reasons[room.reason] : copy.unavailable}
                      </p>
                    )}
                  </div>
                  <div className={styles.rates}>
                    {room.ratePlans.map((rate) => (
                      <div key={rate.code} className={styles.rate}>
                        <div>
                          <h4>{rate.name}</h4>
                          {rate.perks?.length > 0 && (
                            <ul>
                              {rate.perks.map((perk) => (
                                <li key={perk}>
                                  <HotelIcon name="check" />
                                  {perk}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className={rate.isRefundable ? styles.refundable : 'small muted'}>
                            {rate.isRefundable
                              ? t('hotel.freeCancel', { days: rate.freeCancelDays })
                              : copy.nonRefundable}
                          </p>
                        </div>
                        <div className={styles.ratePrice}>
                          {rate.discountPct !== null && rate.discountPct > 0 && (
                            <span className={styles.discount}>-{rate.discountPct}%</span>
                          )}
                          {rate.listPricePerNight !== null &&
                            rate.pricePerNight !== null &&
                            rate.listPricePerNight > rate.pricePerNight && (
                              <del>{formatPrice(rate.listPricePerNight)}</del>
                            )}
                          {rate.pricePerNight !== null ? (
                            <>
                              <strong>{formatPrice(rate.pricePerNight)}</strong>
                              <small>{copy.perNight}</small>
                            </>
                          ) : (
                            <p>{copy.rateUnavailable}</p>
                          )}
                          {rate.totalPrice !== null && (
                            <p>
                              {copy.total}: <b>{formatPrice(rate.totalPrice)}</b>
                            </p>
                          )}
                          {room.isAvailable && rate.totalPrice !== null && (
                            <BookRateButton
                              booking={{
                                productId: room.productId,
                                ratePlanCode: rate.code,
                                checkIn: hotel.stay.checkIn,
                                checkOut: hotel.stay.checkOut,
                                adults: hotel.stay.adults,
                                roomCount: room.roomsNeeded,
                              }}
                              isDisabled={query.isFetching}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
          {hasAmenities && (
            <section id="amenities" className={styles.section}>
              <h2>{copy.allAmenities}</h2>
              <div className={styles.amenityGroups}>
                {groups.map((group) => (
                  <div key={group}>
                    <h3>{getLabel(copy.groups, group)}</h3>
                    <ul>
                      {hotel.amenities
                        .filter((amenity) => amenity.group === group)
                        .map((amenity) => (
                          <li key={amenity.name}>
                            <HotelIcon name={amenity.icon} />
                            {amenity.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
              {facts.length > 0 && (
                <>
                  <h3>{copy.facts}</h3>
                  <dl className={styles.facts}>
                    {facts.map(([key, value]) => (
                      <div key={key}>
                        <dt>{getLabel(copy.factLabels, key)}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              {!!hotel.languages?.length && (
                <p>
                  <strong>{copy.languages}: </strong>
                  {hotel.languages.map((language) => getLabel(copy.languageNames, language)).join(', ')}
                </p>
              )}
            </section>
          )}
          {hasPolicies && (
            <section id="policies" className={styles.section}>
              <h2>{copy.policies}</h2>
              {(hotel.checkInTime || hotel.checkOutTime) && (
                <div className={styles.checkTimes}>
                  {hotel.checkInTime && (
                    <p>
                      {copy.checkIn}
                      <strong>{hotel.checkInTime}</strong>
                    </p>
                  )}
                  {hotel.checkOutTime && (
                    <p>
                      {copy.checkOut}
                      <strong>{hotel.checkOutTime}</strong>
                    </p>
                  )}
                </div>
              )}
              <dl className={styles.policyList}>
                {policies.map(([key, value]) => (
                  <div key={key}>
                    <dt>{getLabel(copy.policyLabels, key)}</dt>
                    <dd>{key === 'depositAmount' ? formatPrice(Number(value)) : String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <HotelReviews key={id} id={id} />
        </>
      )}
    </main>
  );
}
