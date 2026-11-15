'use client';
import { useStaySearch, type StayFilters } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { formatPrice } from './trip-card';
import { StayThumbnail } from './stay-thumbnail';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './stay-search.module.css';
import { StaySearchIcon } from './stay-search-icon';
import { OTA_DESTINATIONS, getDestinationHref } from './ota-destinations';
import listing from './hotel-listing.module.css';
import { StayPriceInput } from './stay-price-input';
import { SoftDatePicker } from '@/features/shared/soft-date-picker';
import { placeBelow, SoftSelect, useCloseOnScroll } from '@/features/shared/soft-select';
import {
  getStayDateIssue, getStayPriceIssue, getStayToday, isStayInteger, MAX_STAY_GUESTS, MAX_STAY_ROOMS,
} from './stay-search-validation';
import { parseFullSearchParams } from './search-params';
import { SearchAdBanner } from './search-ad-banner';
import { SoftStarIcon } from './soft-star-icon';
import { PriceRangeSlider } from './price-range-slider';
import { GuestPicker } from '@/features/hotels/guest-picker';

// Vừa chiều cao cột lọc + banner, để trang không bị kéo dài khi nhiều kết quả.
const RESULTS_PAGE_SIZE = 5;
const STAR_OPTIONS = ['', '1', '2', '3', '4', '5'];

type ChildGuests = { children: number; infants: number };

/** Trẻ em, em bé không gửi lên API tìm (API chỉ lọc theo người lớn) nhưng giữ trên URL để mang sang trang khách sạn. */
const childParams = ({ children, infants }: ChildGuests) => ({
  ...(children > 0 ? { children: String(children) } : {}),
  ...(infants > 0 ? { infants: String(infants) } : {}),
});

function getSearchHref(filters: StayFilters, placeName: string, guests: ChildGuests) {
  const query = new URLSearchParams({ q: placeName });
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  for (const [key, value] of Object.entries(childParams(guests))) query.set(key, value);
  return `/search?${query}`;
}

export function LiveSearchScreen({
  initialQuery = '',
  initialFilters,
  initialGuests = { children: 0, infants: 0 },
  isHomepage = false,
}: {
  initialQuery?: string;
  initialFilters?: Partial<StayFilters>;
  initialGuests?: ChildGuests;
  isHomepage?: boolean;
}) {
  const [childGuests, setChildGuests] = useState<ChildGuests>(initialGuests);
  const search = useStaySearch(initialQuery, initialFilters, {
    pageSize: isHomepage ? undefined : RESULTS_PAGE_SIZE,
  });
  const { apply } = search;
  const pageCount = Math.ceil((search.stays.data?.total ?? 0) / RESULTS_PAGE_SIZE);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const lastAppliedSearchRef = useRef(searchParamsString);

  useEffect(() => {
    if (isHomepage) return;
    if (lastAppliedSearchRef.current === searchParamsString) {
      return;
    }
    lastAppliedSearchRef.current = searchParamsString;
    const next = parseFullSearchParams(searchParamsString);
    apply(next.placeName, next.filters);
  }, [isHomepage, searchParamsString, apply]);

  const [suggestionsOpen, setSuggestionsOpen] = useState(!initialFilters?.placeId);
  const placeFieldRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const showSuggestions = suggestionsOpen && !search.selection && !search.filters.placeId && search.text.trim().length >= 2;
  useCloseOnScroll(showSuggestions, suggestionsRef);

  useEffect(() => {
    const field = placeFieldRef.current;
    const popup = suggestionsRef.current;
    if (!field || !popup) return;
    if (!showSuggestions) {
      popup.hidePopover();
      return;
    }
    const rect = field.getBoundingClientRect();
    popup.style.width = `${Math.min(Math.max(rect.width, 320), window.innerWidth - 32)}px`;
    placeBelow(field, popup);
    const available = popup.dataset.side === 'top' ? rect.top : window.innerHeight - rect.bottom;
    popup.style.maxHeight = `${Math.min(340, Math.max(0, available - 22))}px`;
    popup.showPopover();
  }, [showSuggestions]);
  const [showValidation, setShowValidation] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const today = getStayToday();
  const { checkIn, checkOut, adults, rooms, priceMin, priceMax } = search.filters;
  const dateIssue = getStayDateIssue(checkIn, checkOut, today);
  const priceIssue = getStayPriceIssue(priceMin, priceMax);
  const guestsInvalid = !isStayInteger(adults, 1, MAX_STAY_GUESTS);
  const roomsInvalid = !!rooms && !isStayInteger(rooms, 1, MAX_STAY_ROOMS);
  const tripIssue = dateIssue ?? (guestsInvalid ? 'invalidGuests' : roomsInvalid ? 'invalidRooms' : null);
  const tripError = showValidation && tripIssue ? vi.ota[tripIssue] : undefined;
  const priceError = showValidation && priceIssue ? vi.ota[priceIssue] : undefined;
  const update = (key: keyof StayFilters, value: string) =>
    search.setFilters((previous) => ({ ...previous, [key]: value }));
  const placeName = search.selection?.name ?? search.text;
  const hasFacets = !!(search.filters.minStars || search.filters.stars || search.filters.priceMin || search.filters.priceMax || search.filters.sort !== 'price');
  // Tên điểm đến của kết quả đang hiển thị (theo URL), không phải chữ đang gõ dở trong ô tìm kiếm.
  const appliedPlaceName = isHomepage ? placeName : parseFullSearchParams(searchParamsString).placeName;
  const resultHref = search.submitted ? getSearchHref(search.submitted, appliedPlaceName, childGuests) : '/search';
  const canSubmit = !!search.filters.placeId || search.selection?.type === 'hotel';
  const Container = isHomepage ? 'section' : 'div';
  return (
    <Container
      id={isHomepage ? 'ota-search' : undefined}
      className={isHomepage ? 'ota-container results-page ota-home' : undefined}
    >
      <form
        id="stay-search-form"
        className={`search-form ${styles.panel} ${isHomepage ? styles.homepagePanel : listing.searchPanel}`}
        aria-label={vi.api.findStays}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          if (tripIssue || priceIssue) {
            const form = event.currentTarget;
            setShowValidation(true);
            requestAnimationFrame(() => {
              const invalidField = Array.from(form.elements).find(
                (field): field is HTMLInputElement => field instanceof HTMLInputElement && field.getAttribute('aria-invalid') === 'true',
              );
              invalidField?.focus();
            });
            return;
          }
          setShowValidation(false);
          setSuggestionsOpen(false);
          if (search.selection?.type === 'hotel') {
            router.push(
              `/hotels/${encodeURIComponent(search.selection.refId)}?${new URLSearchParams({ checkIn: search.filters.checkIn, checkOut: search.filters.checkOut, adults: search.filters.adults, ...childParams(childGuests) })}`,
            );
            return;
          }
          const href = getSearchHref(search.filters, placeName, childGuests);
          if (!isHomepage && href === resultHref && search.submitted) {
            if (search.cursor) search.first();
            else void search.stays.refetch();
          } else if (isHomepage) {
            router.push(href, { scroll: true });
          } else {
            window.history.pushState(null, '', href);
          }
        }}
      >
        {isHomepage && (
          <div className={styles.heading}>
            <span className={styles.service}>
              <StaySearchIcon name="hotel" />
              {vi.api.hotels}
            </span>
            {/* Bộ lọc thêm trượt ngang ra trong khoảng trống của hàng tab, không đè lên ô tìm hay nút tìm. */}
            <div
              id="home-more-filters"
              className={styles.inlineFilters}
              data-open={moreFiltersOpen}
              inert={!moreFiltersOpen}
            >
                <label>
                  {vi.api.minStars}
                  <SoftSelect
                    className={styles.inlineSelect}
                    value={search.filters.minStars}
                    onChange={(value) => update('minStars', value)}
                    options={[
                      { value: '', label: vi.api.all },
                      ...[1, 2, 3, 4, 5].map((stars) => ({ value: String(stars), label: String(stars) })),
                    ]}
                  />
                </label>
                <label>
                  {vi.api.maxPrice}
                  <StayPriceInput value={priceMax} onChange={(value) => update('priceMax', value)} errorId={priceError ? 'stay-home-price-error' : undefined} />
                </label>
                <label>
                  {vi.demo.web.sort}
                  <SoftSelect
                    className={styles.inlineSelect}
                    value={search.filters.sort}
                    onChange={(value) => update('sort', value)}
                    options={[
                      { value: 'price', label: vi.api.price },
                      { value: 'stars', label: vi.api.stars },
                    ]}
                  />
                </label>
            </div>
            <button
              type="button"
              className={styles.moreFiltersToggle}
              aria-expanded={moreFiltersOpen}
              aria-controls="home-more-filters"
              onClick={() => setMoreFiltersOpen((open) => !open)}
            >
              <StaySearchIcon name="filter" />
              {vi.api.otaMoreFilters}
            </button>
          </div>
        )}
        <div className={styles.searchRow}>
          <div
            ref={placeFieldRef}
            className={`ota-place-field ${styles.placeField} ${styles.field}`}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setSuggestionsOpen(false);
            }}
          >
            <StaySearchIcon name="place" />
            <div className={styles.fieldContent}>
              <label htmlFor="place-query">{isHomepage ? vi.api.destination : vi.api.search}</label>
              <input
                id="place-query"
                value={search.selection?.name ?? search.text}
                maxLength={100}
                placeholder={vi.api.otaPlacePlaceholder}
                autoComplete="off"
                aria-describedby={isHomepage ? undefined : 'place-query-hint'}
                aria-controls="place-suggestions"
                onFocus={() => setSuggestionsOpen(true)}
                onClick={() => setSuggestionsOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSuggestionsOpen(false);
                }}
                onChange={(event) => {
                  search.setText(event.target.value);
                  setSuggestionsOpen(true);
                  update('placeId', '');
                }}
              />
            </div>
            <div
              id="place-suggestions"
              ref={suggestionsRef}
              popover="auto"
              onToggle={(event) => {
                if (event.newState === 'closed') setSuggestionsOpen(false);
              }}
              className={styles.suggestions}
            >
              <ApiErrorNotice
                error={search.suggestions.error}
                retry={() => {
                  void search.suggestions.refetch();
                }}
              />
              {search.suggestions.isFetching && <output>{vi.api.loading}</output>}
              {search.suggestions.data?.items.length === 0 && <p>{vi.api.noSuggestions}</p>}
              <div className="suggested-queries" aria-label={vi.api.places}>
                {search.suggestions.data?.items.map((place) => (
                  <button
                    type="button"
                    className="secondary-button max-w-full"
                    key={place.id}
                    aria-pressed={search.selection?.id === place.id}
                    aria-labelledby={`suggestion-${place.id}-name`}
                    aria-describedby={place.subtitle ? `suggestion-${place.id}-subtitle` : undefined}
                    onClick={() => {
                      search.choosePlace(place);
                      setSuggestionsOpen(false);
                    }}
                  >
                    <span className="min-w-0 whitespace-normal text-left">
                      <span className="block" id={`suggestion-${place.id}-name`}>
                        {place.name}
                      </span>
                      {place.subtitle && (
                        <span
                          className="small muted block font-normal"
                          id={`suggestion-${place.id}-subtitle`}
                        >
                          {place.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className={styles.field} htmlFor="stay-check-in">
            <StaySearchIcon name="calendar" />
            <span className={styles.fieldContent}>
              <span>{vi.api.checkIn}</span>
              <SoftDatePicker
                id="stay-check-in"
                appearance="bare"
                className={styles.dateField}
                required
                min={today}
                value={checkIn}
                aria-invalid={showValidation && tripIssue === 'invalidCheckIn' || undefined}
                aria-describedby={tripError && tripIssue === 'invalidCheckIn' ? 'stay-trip-error' : undefined}
                onChange={(value) => update('checkIn', value)}
              />
            </span>
          </label>
          <label className={styles.field} htmlFor="stay-check-out">
            <StaySearchIcon name="calendar" />
            <span className={styles.fieldContent}>
              <span>{vi.api.checkOut}</span>
              <SoftDatePicker
                id="stay-check-out"
                appearance="bare"
                className={styles.dateField}
                required
                min={checkIn || today}
                value={checkOut}
                aria-invalid={showValidation && (tripIssue === 'invalidDates' || tripIssue === 'stayTooLong') || undefined}
                aria-describedby={tripError && (tripIssue === 'invalidDates' || tripIssue === 'stayTooLong') ? 'stay-trip-error' : undefined}
                onChange={(value) => update('checkOut', value)}
              />
            </span>
          </label>
          <div className={styles.field}>
            <StaySearchIcon name="guests" />
            <span className={styles.fieldContent}>
              {/* Chọn người lớn, trẻ em, em bé ngay ở trang tìm như trang khách sạn trước đây. */}
              <GuestPicker
                adults={Number(adults) || 1}
                numChildren={childGuests.children}
                numInfants={childGuests.infants}
                onChange={(guests) => {
                  update('adults', String(guests.adults));
                  setChildGuests({ children: guests.children, infants: guests.infants });
                }}
              />
            </span>
          </div>
          <label className={styles.field}>
            <StaySearchIcon name="rooms" />
            <span className={styles.fieldContent}>
              <span>{vi.api.rooms}</span>
              <input
                type="number"
                min={1}
                max={MAX_STAY_ROOMS}
                placeholder={vi.api.all}
                value={rooms}
                aria-invalid={showValidation && tripIssue === 'invalidRooms' || undefined}
                aria-describedby={tripError && tripIssue === 'invalidRooms' ? 'stay-trip-error' : undefined}
                onChange={(event) => update('rooms', event.target.value)}
              />
            </span>
          </label>
          <button
            className={`primary-button ${styles.submit}`}
            type="submit"
            disabled={!canSubmit || search.stays.isFetching}
          >
            <StaySearchIcon name="search" />
            {search.stays.isFetching ? vi.api.loading : vi.api.findStays}
          </button>
        </div>
        {!isHomepage && (
          <div className={styles.toolbar}>
            <p id="place-query-hint">{vi.api.searchHint}</p>
          </div>
        )}
        {tripError && <p id="stay-trip-error" role="alert" className={listing.filterError}>{tripError}</p>}
        {isHomepage && priceError && <p id="stay-home-price-error" role="alert" className={listing.filterError}>{priceError}</p>}
      </form>
      {!isHomepage && (
        <div className={listing.layout}>
          <div className={listing.sidebar}>
            <aside className={listing.filterPanel} aria-labelledby="stay-filter-title">
              <div className={listing.panelHead}>
                <h2 id="stay-filter-title">
                  <StaySearchIcon name="filter" />
                  {vi.ota.filterTitle}
                </h2>
                {hasFacets && (
                  <button
                    type="button"
                    className={listing.panelReset}
                    onClick={() => {
                      const cleared = {
                        ...search.filters,
                        minStars: '',
                        stars: '',
                        priceMin: '',
                        priceMax: '',
                        sort: 'price',
                      } as const;
                      search.setFilters(cleared);
                      if (cleared.placeId) {
                        const href = getSearchHref(cleared, placeName, childGuests);
                        if (isHomepage) {
                          router.push(href, { scroll: false });
                        } else {
                          window.history.pushState(null, '', href);
                        }
                      }
                    }}
                  >
                    {vi.ota.resetFilters}
                  </button>
                )}
              </div>
              <fieldset className={listing.panelGroup}>
                <legend>{vi.ota.starRating}</legend>
                <div className={listing.starChips}>
                  {STAR_OPTIONS.map((stars) => (
                    <label key={stars || 'all'} className={listing.chip}>
                      <input
                        type="radio"
                        name="stay-stars"
                        value={stars}
                        checked={(search.filters.stars ?? '') === stars}
                        aria-label={stars ? t('ota.starsExact', { count: stars }) : vi.api.all}
                        // Chip lọc đúng hạng sao; bỏ minStars (có thể còn từ trang chủ) để hai điều kiện không chồng nhau.
                        onChange={() => search.setFilters((previous) => ({ ...previous, stars, minStars: '' }))}
                      />
                      {stars ? (
                        <>
                          {stars}
                          <SoftStarIcon />
                        </>
                      ) : (
                        vi.api.all
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={listing.panelGroup}>
                <legend>{vi.ota.priceRangeTitle}</legend>
                <PriceRangeSlider
                  priceMin={search.filters.priceMin}
                  priceMax={search.filters.priceMax}
                  onChange={(range) => search.setFilters((previous) => ({ ...previous, ...range }))}
                />
              </fieldset>
              {priceError && (
                <p id="stay-price-error" role="alert" className={listing.filterError}>
                  {priceError}
                </p>
              )}
              <fieldset className={listing.panelGroup}>
                <legend>{vi.demo.web.sort}</legend>
                <div className={listing.segmented}>
                  <label className={listing.chip} title={vi.ota.sortPriceAsc}>
                    <input
                      type="radio"
                      name="stay-sort"
                      value="price"
                      aria-label={vi.ota.sortPriceAsc}
                      checked={search.filters.sort === 'price'}
                      onChange={() => update('sort', 'price')}
                    />
                    <StaySearchIcon name="sortAsc" />
                  </label>
                  <label className={listing.chip} title={vi.ota.sortPriceDesc}>
                    <input
                      type="radio"
                      name="stay-sort"
                      value="price_desc"
                      aria-label={vi.ota.sortPriceDesc}
                      checked={search.filters.sort === 'price_desc'}
                      onChange={() => update('sort', 'price_desc')}
                    />
                    <StaySearchIcon name="sortDesc" />
                  </label>
                </div>
              </fieldset>
              <button
                className="secondary-button"
                type="submit"
                form="stay-search-form"
                disabled={!search.filters.placeId || search.stays.isFetching}
              >
                {vi.ota.applyFilters}
              </button>
            </aside>
            <SearchAdBanner />
          </div>
          <section
            className={listing.results}
            aria-labelledby="stay-results-title"
            aria-busy={search.stays.isFetching}
          >
            <div className={listing.resultsHead}>
              <h2 id="stay-results-title">{vi.ota.resultTitle}</h2>
              {search.stays.data && (
                <output>
                  {appliedPlaceName
                    ? t('ota.hotelCountAt', { count: search.stays.data.total, place: appliedPlaceName })
                    : t('ota.hotelCount', { count: search.stays.data.total })}
                </output>
              )}
            </div>
            <nav className={listing.quickPlaces} aria-label={vi.ota.findByPlace}>
              {OTA_DESTINATIONS.map((destination) => {
                const targetHref = search.submitted
                  ? getSearchHref({ ...search.submitted, placeId: destination.id }, destination.name, childGuests)
                  : getDestinationHref(destination);
                return (
                  <a
                    key={destination.id}
                    href={targetHref}
                    aria-current={destination.id === search.submitted?.placeId ? 'true' : undefined}
                    onClick={(event) => {
                      if (
                        event.button === 0 &&
                        !event.altKey &&
                        !event.ctrlKey &&
                        !event.metaKey &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        if (isHomepage) {
                          router.push(targetHref);
                        } else {
                          window.history.pushState(null, '', targetHref);
                        }
                      }
                    }}
                  >
                    {destination.name}
                  </a>
                );
              })}
            </nav>
            {!search.submitted && <p className={listing.state}>{vi.api.choosePlace}</p>}
            {search.stays.isFetching && <output className={listing.state}>{vi.api.loading}</output>}
            <ApiErrorNotice
              error={search.stays.error}
              retry={() => {
                void search.stays.refetch();
              }}
            />
            {search.stays.data?.items.length === 0 && (
              <div className={listing.state}>
                <strong>{vi.ota.noMatchingStays}</strong>
                <p>{vi.ota.noStaysHint}</p>
              </div>
            )}
            <div className={listing.cards}>
              {search.stays.data?.items.map((stay) => {
                const href = {
                  pathname: `/hotels/${encodeURIComponent(stay.hotelId)}`,
                  query: {
                    checkIn: search.submitted?.checkIn,
                    checkOut: search.submitted?.checkOut,
                    adults: search.submitted?.adults,
                    ...childParams(childGuests),
                    from: resultHref,
                  },
                };
                return (
                  // Cả card là một link như card khách sạn ở trang chủ: bấm chỗ nào cũng mở trang khách sạn.
                  <article key={stay.hotelId}>
                    <Link prefetch={false} className={listing.card} href={href}>
                      <div className={listing.photo}>
                        <StayThumbnail url={stay.thumbnail} name={stay.name} />
                      </div>
                      <div className={listing.cardInfo}>
                        <p className="eyebrow">
                          {stay.province.name}
                          {/* Điểm đánh giá của khách thay cho hạng sao, để khớp với điểm ở trang chi tiết. */}
                          {stay.rating
                            ? ` · ★ ${t('ota.stayRating', { average: stay.rating.average.toLocaleString('vi-VN'), count: stay.rating.count })}`
                            : ''}
                        </p>
                        <h3>{stay.name}</h3>
                      </div>
                      <div className={listing.price}>
                        <strong>{formatPrice(stay.unitPrice)}</strong>
                        <span>{vi.hotel.perNight}</span>
                        <p>
                          {vi.api.total} · {formatPrice(stay.totalPrice)}
                        </p>
                        <span className="primary-button" aria-hidden="true">
                          {vi.hotel.chooseRoom}
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
          {(search.pageNumber > 1 || search.stays.data?.nextCursor) && (
            <nav className={listing.paging} aria-label={vi.ota.pagination}>
              <button
                className="secondary-button"
                disabled={search.pageNumber === 1 || search.stays.isFetching}
                onClick={search.previous}
              >
                {vi.ota.previousPage}
              </button>
              <output aria-live="polite">
                {t('ota.pageOf', {
                  page: search.pageNumber,
                  total: Math.max(pageCount, search.pageNumber),
                })}
              </output>
              <button
                className="secondary-button"
                disabled={!search.stays.data?.nextCursor || search.stays.isFetching}
                onClick={search.next}
              >
                {vi.ota.nextPage}
              </button>
            </nav>
          )}
        </div>
      )}
    </Container>
  );
}
