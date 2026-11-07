import { FlightBanner } from '@/features/flights/flight-banner';
import { FlightResults } from '@/features/flights/flight-results';
import { FlightSearchForm } from '@/features/flights/flight-search-form';
import styles from '@/features/flights/flights.module.css';
import { getFlightToday, parseFlightReturnDate, parseFlightSearch } from '@tripflix/api-client/flight-search';
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
    sort: read('sort'),
  };
  const search = parseFlightSearch(draft, today);
  const isRound = read('trip') === 'round';
  const returnDate = isRound && search ? parseFlightReturnDate(read('returnDate'), search.date) : null;
  // Chiều đi đã chọn của vé khứ hồi; có thì trang hiện bước chọn chuyến về.
  const outbound =
    returnDate && read('out') && read('outFare')
      ? { productId: read('out'), ratePlanCode: read('outFare') }
      : null;
  const hasSearch = ['from', 'to', 'date', 'passengers'].some((key) => key in params);

  return (
    <main id="content" className={'ota-container ' + styles.page}>
      <FlightBanner activeStep={search ? 2 : 1} />
      <FlightSearchForm
        key={'form-' + JSON.stringify(draft) + read('trip') + read('returnDate')}
        initial={search}
        initialTripType={isRound ? 'round' : 'oneWay'}
        initialReturnDate={read('returnDate') || null}
        today={today}
      />
      {hasSearch && !search && (
        <p role="alert" className="empty-state">
          {copy.invalidSearch}
        </p>
      )}
      {search && isRound && !returnDate && (
        <p role="alert" className="empty-state">
          {copy.invalidReturnDate}
        </p>
      )}
      {search && (!isRound || returnDate) && (
        <FlightResults
          key={'results-' + JSON.stringify({ search, returnDate, outbound })}
          search={search}
          returnDate={returnDate}
          outbound={outbound}
          initialProductId={read('productId')}
          initialFareCode={read('ratePlanCode')}
        />
      )}
    </main>
  );
}
