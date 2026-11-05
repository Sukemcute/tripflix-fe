'use client';
import { useStaySearch, type StayFilters } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { formatPrice } from './trip-card';
import { StayThumbnail } from './stay-thumbnail';

export function LiveSearchScreen({
  initialQuery = '',
  isHomepage = false,
}: {
  initialQuery?: string;
  isHomepage?: boolean;
}) {
  const search = useStaySearch(initialQuery);
  const update = (key: keyof StayFilters, value: string) =>
    search.setFilters((previous) => ({ ...previous, [key]: value }));
  return (
    <main
      id="content"
      className={isHomepage ? 'ota-container results-page ota-home' : 'ota-container results-page'}
    >
      {!isHomepage && <h1>{vi.api.stays}</h1>}
      <form
        className="search-form"
        aria-label={vi.api.findStays}
        onSubmit={(event) => {
          event.preventDefault();
          search.submit();
        }}
      >
        <div className="ota-place-field">
          <label htmlFor="place-query">{isHomepage ? vi.api.destination : vi.api.search}</label>
          <input
            id="place-query"
            value={search.text}
            maxLength={100}
            placeholder={vi.api.searchHint}
            onChange={(event) => {
              search.setText(event.target.value);
              update('placeId', '');
            }}
          />
        </div>
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
              onClick={() => search.choosePlace(place)}
            >
              <span className="min-w-0 whitespace-normal text-left">
                <span className="block" id={`suggestion-${place.id}-name`}>
                  {place.name}
                </span>
                {place.subtitle && (
                  <span className="small muted block font-normal" id={`suggestion-${place.id}-subtitle`}>
                    {place.subtitle}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <label>
            {vi.api.checkIn}
            <input
              type="date"
              required
              value={search.filters.checkIn}
              onChange={(event) => update('checkIn', event.target.value)}
            />
          </label>
          <label>
            {vi.api.checkOut}
            <input
              type="date"
              required
              value={search.filters.checkOut}
              onChange={(event) => update('checkOut', event.target.value)}
            />
          </label>
          <label>
            {vi.api.adults}
            <input
              type="number"
              min={1}
              required
              value={search.filters.adults}
              onChange={(event) => update('adults', event.target.value)}
            />
          </label>
          <label>
            {vi.api.rooms}
            <input
              type="number"
              min={1}
              max={99}
              value={search.filters.rooms}
              onChange={(event) => update('rooms', event.target.value)}
            />
          </label>
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
            <select value={search.filters.sort} onChange={(event) => update('sort', event.target.value)}>
              <option value="price">{vi.api.price}</option>
              <option value="stars">{vi.api.stars}</option>
            </select>
          </label>
        </div>
        <button
          className="primary-button"
          type="submit"
          disabled={!search.filters.placeId || search.stays.isFetching}
        >
          {search.stays.isFetching ? vi.api.loading : vi.api.findStays}
        </button>
      </form>
      {!search.submitted && <p className="empty-state">{vi.api.choosePlace}</p>}
      <ApiErrorNotice
        error={search.stays.error}
        retry={() => {
          void search.stays.refetch();
        }}
      />
      {search.stays.data && (
        <output>
          {search.stays.data.total} {vi.api.stays}
        </output>
      )}
      {search.stays.data?.items.length === 0 && <div className="empty-state">{vi.api.noStays}</div>}
      <div className="trip-grid result-grid">
        {search.stays.data?.items.map((stay) => (
          <article className="trip-card" key={stay.hotelId}>
            <div className="trip-card-body">
              <StayThumbnail url={stay.thumbnail} name={stay.name} />
              <p className="eyebrow">
                {stay.province.name}
                {stay.stars ? ` · ${stay.stars} ★` : ''}
              </p>
              <h2>{stay.name}</h2>
              <p>
                {formatPrice(stay.unitPrice)} / {vi.api.perNight}
              </p>
              <p>
                <strong>
                  {vi.api.total}: {formatPrice(stay.totalPrice)}
                </strong>
              </p>
              <p className="small muted">{vi.api.bookingUnavailable}</p>
            </div>
          </article>
        ))}
      </div>
      {search.selection?.type === 'hotel' && <p>{vi.api.hotelUnavailable}</p>}
      {search.stays.data?.nextCursor && (
        <button className="secondary-button" disabled={search.stays.isFetching} onClick={search.next}>
          {vi.api.next}
        </button>
      )}
      {search.cursor && (
        <button className="secondary-button" onClick={search.first}>
          {vi.api.previous}
        </button>
      )}
    </main>
  );
}
