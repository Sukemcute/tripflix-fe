import { FlightDetail } from '@/features/flights/flight-detail';
import styles from '@/features/flights/flights.module.css';
import { getFlightToday, isValidFlightPassengerMix } from '@tripflix/api-client/flight-search';
import { vi } from '@tripflix/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: vi.flights.detailTitle + ' | Tripflix' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Đường dẫn có ký tự % sai định dạng thì giữ nguyên, để API trả 404 thay vì trang lỗi.
function decodeProductId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function FlightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const read = (key: string) => (typeof query[key] === 'string' ? (query[key] as string) : '');
  const today = getFlightToday();
  const requestedDate = read('date');
  const date = ISO_DATE.test(requestedDate) && requestedDate >= today ? requestedDate : today;
  const passengers = /^[1-9]$/.test(read('passengers')) ? Number(read('passengers')) : 1;
  const readCount = (key: string) => (/^\d$/.test(read(key)) ? Number(read(key)) : 0);
  // Nhóm khách sai luật (quá 9 ghế, em bé nhiều hơn người lớn) thì bỏ trẻ em, em bé thay vì báo lỗi.
  const mix = { adults: passengers, children: readCount('children'), infants: readCount('infants') };
  const { children, infants } = isValidFlightPassengerMix(mix) ? mix : { children: 0, infants: 0 };
  const productId = decodeProductId(id);

  return (
    <main id="content" className={'ota-container ' + styles.page}>
      <FlightDetail
        key={[productId, date, passengers, children, infants].join('|')}
        productId={productId}
        date={date}
        passengers={passengers}
        childCount={children}
        infantCount={infants}
        initialFareCode={read('ratePlanCode')}
      />
    </main>
  );
}
