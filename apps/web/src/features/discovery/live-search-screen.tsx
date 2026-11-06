'use client';
import { useStaySearch, type StayFilters } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { formatPrice } from './trip-card';
import { StayThumbnail } from './stay-thumbnail';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './stay-search.module.css';
import { StaySearchIcon } from './stay-search-icon';
import { OTA_DESTINATIONS, getDestinationHref } from './ota-destinations';
import listing from './hotel-listing.module.css';
import { SearchAdBanner } from './search-ad-banner';

// Vừa chiều cao cột lọc + banner, để trang không bị kéo dài khi nhiều kết quả.
const RESULTS_PAGE_SIZE = 5;

function getSearchHref(filters: StayFilters, placeName: string) {
  const query = new URLSearchParams({ q: placeName });
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  return `/search?${query}`;
}

export function LiveSearchScreen({
  initialQuery = '',
  initialFilters,
  isHomepage = false,
}: {
  initialQuery?: string;
  initialFilters?: Partial<StayFilters>;
  isHomepage?: boolean;
}) {
  const search = useStaySearch(initialQuery, initialFilters, {
    pageSize: isHomepage ? undefined : RESULTS_PAGE_SIZE,
  });
  const pageCount = Math.ceil((search.stays.data?.total ?? 0) / RESULTS_PAGE_SIZE);
  const router = useRouter();
  const [suggestionsOpen, setSuggestionsOpen] = useState(!initialFilters?.placeId);
  const [hasInvalidDates, setHasInvalidDates] = useState(false);
  const update = (key: keyof StayFilters, value: string) =>
    search.setFilters((previous) => ({ ...previous, [key]: value }));
  const placeName = search.selection?.name ?? search.text;
  const resultHref = search.submitted ? getSearchHref(search.submitted, initialQuery) : '/search';
  const canSubmit = !!search.filters.placeId || search.selection?.type === 'hotel';
  const Container = isHomepage ? 'section' : 'div';
  return (
    <Container
      id={isHomepage ? 'ota-search' : undefined}
      className={isHomepage ? 'ota-container results-page ota-home' : undefined}
    >
      <form
        id="stay-search-form"
        className={`search-form ${styles.panel} ${isHomepage ? '' : listing.searchPanel}`}
        aria-label={vi.api.findStays}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          if (search.filters.checkOut <= search.filters.checkIn) {
            setHasInvalidDates(true);
            return;
          }
          setHasInvalidDates(false);
          setSuggestionsOpen(false);
          if (search.selection?.type === 'hotel') {
            router.push(
              `/hotels/${encodeURIComponent(search.selection.refId)}?${new URLSearchParams({ checkIn: search.filters.checkIn, checkOut: search.filters.checkOut, adults: search.filters.adults })}`,
            );
            return;
          }
          const href = getSearchHref(search.filters, placeName);
          if (!isHomepage && href === resultHref && search.submitted) {
            if (search.cursor) search.first();
            else void search.stays.refetch();
          } else {
            router.push(href, { scroll: isHomepage });
          }
        }}
      >
        {isHomepage && (
          <div className={styles.heading}>
            <span className={styles.service}>
              <StaySearchIcon name="hotel" />
              {vi.api.hotels}
            </span>
            <span className={styles.headingHint}>{vi.api.otaSearchIntro}</span>
          </div>
        )}
        <div className={styles.searchRow}>
          <div
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
                aria-describedby="place-query-hint"
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
              hidden={
                !suggestionsOpen ||
                !!search.selection ||
                !!search.filters.placeId ||
                search.text.trim().length < 2
              }
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
          <label className={styles.field}>
            <StaySearchIcon name="calendar" />
            <span className={styles.fieldContent}>
              <span>{vi.api.checkIn}</span>
              <input
                type="date"
                required
                value={search.filters.checkIn}
                onChange={(event) => update('checkIn', event.target.value)}
              />
            </span>
          </label>
          <label className={styles.field}>
            <StaySearchIcon name="calendar" />
            <span className={styles.fieldContent}>
              <span>{vi.api.checkOut}</span>
              <input
                type="date"
                required
                value={search.filters.checkOut}
                onChange={(event) => update('checkOut', event.target.value)}
              />
            </span>
          </label>
          <label className={styles.field}>
            <StaySearchIcon name="guests" />
            <span className={styles.fieldContent}>
              <span>{vi.api.adults}</span>
              <input
                type="number"
                min={1}
                max={9}
                required
                value={search.filters.adults}
                onChange={(event) => update('adults', event.target.value)}
              />
            </span>
          </label>
          <label className={styles.field}>
            <StaySearchIcon name="rooms" />
            <span className={styles.fieldContent}>
              <span>{vi.api.rooms}</span>
              <input
                type="number"
                min={1}
                max={99}
                placeholder={vi.api.all}
                value={search.filters.rooms}
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
        <div className={styles.toolbar}>
          <p id="place-query-hint">{vi.api.searchHint}</p>
          {isHomepage && (
            <details className={styles.advanced}>
              <summary>
                <StaySearchIcon name="filter" />
                {vi.api.otaMoreFilters}
              </summary>
              <div className={`filter-bar ${styles.advancedFields}`}>
                <label>
                  {vi.api.minStars}
                  <select
                    value={search.filters.minStars}
                    onChange={(event) => update('minStars', event.target.value)}
                  >
                    <option value="">{vi.api.all}</option>
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <option key={stars} value={stars}>
                        {stars}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {vi.api.maxPrice}
                  <input
                    type="number"
                    min={0}
                    value={search.filters.priceMax}
                    onChange={(event) => update('priceMax', event.target.value)}
                  />
                </label>
                <label>
                  {vi.demo.web.sort}
                  <select
                    value={search.filters.sort}
                    onChange={(event) => update('sort', event.target.value)}
                  >
                    <option value="price">{vi.api.price}</option>
                    <option value="stars">{vi.api.stars}</option>
                  </select>
                </label>
              </div>
            </details>
          )}
        </div>
        {hasInvalidDates && (
          <p role="alert" className={listing.dateError}>
            {vi.ota.invalidDates}
          </p>
        )}
      </form>
      {!isHomepage && (
        <div className={listing.layout}>
          <div className={listing.sidebar}>
            <aside className={listing.filters} aria-labelledby="stay-filter-title">
              <h2 id="stay-filter-title">
                <StaySearchIcon name="filter" />
                {vi.ota.filterTitle}
              </h2>
              <label>
                {vi.api.minStars}
                <select
                  form="stay-search-form"
                  value={search.filters.minStars}
                  onChange={(event) => update('minStars', event.target.value)}
                >
                  <option value="">{vi.api.all}</option>
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <option key={stars} value={stars}>
                      {stars} ★
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {vi.api.maxPrice}
                <input
                  form="stay-search-form"
                  type="number"
                  min={0}
                  value={search.filters.priceMax}
                  onChange={(event) => update('priceMax', event.target.value)}
                />
              </label>
              <label>
                {vi.demo.web.sort}
                <select
                  form="stay-search-form"
                  value={search.filters.sort}
                  onChange={(event) => update('sort', event.target.value)}
                >
                  <option value="price">{vi.ota.lowerPrice}</option>
                  <option value="stars">{vi.ota.higherStars}</option>
                </select>
              </label>
              <button
                className="secondary-button"
                type="submit"
                form="stay-search-form"
                disabled={!search.filters.placeId || search.stays.isFetching}
              >
                {vi.ota.applyFilters}
              </button>
              {(search.filters.minStars ||
                search.filters.priceMin ||
                search.filters.priceMax ||
                search.filters.sort !== 'price') && (
                <button
                  type="button"
                  className={listing.clearFilters}
                  onClick={() => {
                    const cleared = {
                      ...search.filters,
                      minStars: '',
                      priceMin: '',
                      priceMax: '',
                      sort: 'price',
                    } as const;
                    search.setFilters(cleared);
                    if (cleared.placeId) router.push(getSearchHref(cleared, placeName), { scroll: false });
                  }}
                >
                  {vi.ota.clearFilters}
                </button>
              )}
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
                  {initialQuery
                    ? t('ota.hotelCountAt', { count: search.stays.data.total, place: initialQuery })
                    : t('ota.hotelCount', { count: search.stays.data.total })}
                </output>
              )}
            </div>
            <nav className={listing.quickPlaces} aria-label={vi.ota.findByPlace}>
              {OTA_DESTINATIONS.map((destination) => (
                <Link
                  key={destination.id}
                  href={
                    search.submitted
                      ? getSearchHref({ ...search.submitted, placeId: destination.id }, destination.name)
                      : getDestinationHref(destination)
                  }
                  aria-current={destination.id === search.submitted?.placeId ? 'true' : undefined}
                  scroll={false}
                >
                  {destination.name}
                </Link>
              ))}
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
                    from: resultHref,
                  },
                };
                return (
                  <article className={listing.card} key={stay.hotelId}>
                    <div className={listing.photo}>
                      <StayThumbnail url={stay.thumbnail} name={stay.name} />
                    </div>
                    <div className={listing.cardInfo}>
                      <p className="eyebrow">
                        {stay.province.name}
                        {stay.stars ? ` · ${stay.stars} ★` : ''}
                      </p>
                      <h3>
                        <Link href={href}>{stay.name}</Link>
                      </h3>
                    </div>
                    <div className={listing.price}>
                      <strong>{formatPrice(stay.unitPrice)}</strong>
                      <span>{vi.hotel.perNight}</span>
                      <p>
                        {vi.api.total} · {formatPrice(stay.totalPrice)}
                      </p>
                      <Link className="primary-button" href={href}>
                        {vi.hotel.chooseRoom}
                      </Link>
                    </div>
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
