import { FlightResults } from '@/features/flights/flight-results';
import { FlightSearchForm } from '@/features/flights/flight-search-form';
import styles from '@/features/flights/flights.module.css';
import { getFlightToday, parseFlightSearch } from '@tripflix/api-client/flight-search';
import { vi } from '@tripflix/i18n';
import type { Metadata } from 'next';

const copy = vi.flights;
export const metadata: Metadata = { title: copy.title + ' | Tripflix' };

export default async function FlightsPage({ searchParams }: PageProps<'/flights'>) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : '';
  };
  const today = getFlightToday();
  const draft = {
    from: read('from'),
    to: read('to'),
    date: read('date'),
    passengers: read('passengers') || '1',
  };
  const search = parseFlightSearch(draft, today);
  const hasSearch = ['from', 'to', 'date', 'passengers'].some((key) => key in params);

  return (
    <main id="content" className={'ota-container ' + styles.page}>
      <header className={styles.banner}>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>
      <FlightSearchForm key={'form-' + JSON.stringify(draft)} initial={search} today={today} />
      {hasSearch && !search && (
        <p role="alert" className="empty-state">
          {copy.invalidSearch}
        </p>
      )}
      {search && (
        <FlightResults
          key={'results-' + JSON.stringify(search)}
          search={search}
          initialProductId={read('productId')}
          initialFareCode={read('ratePlanCode')}
        />
      )}
    </main>
  );
}
