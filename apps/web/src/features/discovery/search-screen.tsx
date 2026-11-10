import { searchDemoTrips, type DemoCategory } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { SearchForm } from '@/features/discovery/search-form';
import { formatPrice, TripCard } from '@/features/discovery/trip-card';
import { SoftSelect } from '@/features/shared/soft-select';

export default async function SearchScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 500) : '';
  const category: DemoCategory = ['sea', 'culture', 'hotel'].includes(String(params.category))
    ? (params.category as DemoCategory)
    : 'all';
  const sort = params.sort === 'price' ? 'price' : 'recommended';
  const { criteria, trips } = searchDemoTrips(query, { category, sort });
  const copy = vi.demo;
  const destination = criteria.destination
    ? copy.trips[criteria.destination].destination
    : copy.web.noDestination;
  return (
    <main id="content" className="ota-container results-page">
      <SearchForm key={query} query={query} compact />
      <div className="results-layout">
        <aside className="search-aside">
          <p className="eyebrow">{copy.web.understood}</p>
          <h2>{destination}</h2>
          {query && <p className="query-quote">“{query}”</p>}
          <dl>
            <dt>{copy.web.budget}</dt>
            <dd>{criteria.budget === null ? copy.web.noBudget : formatPrice(criteria.budget)}</dd>
            <dt>{copy.common.guests}</dt>
            <dd>
              {criteria.guests} {copy.common.guests}
            </dd>
          </dl>
          <p className="small muted">{copy.common.notice}</p>
        </aside>
        <section aria-label={copy.web.resultsLabel}>
          <div className="section-heading">
            <div>
              <h1>{copy.web.resultsTitle}</h1>
              <p className="muted">
                {trips.length} {copy.web.resultsCount}
              </p>
            </div>
          </div>
          <form action="/search" className="filter-bar">
            <input type="hidden" name="q" value={query} />
            <label htmlFor="trip-category">
              {copy.web.category}
              <SoftSelect
                id="trip-category"
                name="category"
                defaultValue={category}
                options={[
                  { value: 'all', label: copy.web.all },
                  { value: 'sea', label: copy.web.sea },
                  { value: 'culture', label: copy.web.culture },
                  { value: 'hotel', label: copy.web.hotel },
                ]}
              />
            </label>
            <label htmlFor="trip-sort">
              {copy.web.sort}
              <SoftSelect
                id="trip-sort"
                name="sort"
                defaultValue={sort}
                options={[
                  { value: 'recommended', label: copy.web.recommended },
                  { value: 'price', label: copy.web.priceAscending },
                ]}
              />
            </label>
            <button type="submit" className="secondary-button">
              {copy.web.apply}
            </button>
          </form>
          {trips.length ? (
            <div className="trip-grid result-grid">
              {trips.map((trip) => (
                <TripCard key={trip.slug} trip={trip} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Image src="/brand/tripi-curious.png" alt={vi.mobile.common.mascot} width={150} height={150} />
              <h2>{copy.web.emptyTitle}</h2>
              <p>{copy.web.emptyBody}</p>
              <Link prefetch={false} href="/search" className="primary-button">
                {copy.web.reset}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
