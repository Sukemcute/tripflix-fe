import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { HotelScreen } from '@/features/hotels/hotel-screen';

export const metadata: Metadata = { title: `${vi.hotel.title} | Tripflix` };

export default async function HotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const read = (key: string) => (typeof query[key] === 'string' ? (query[key] as string) : undefined);
  const from = read('from');
  return (
    <HotelScreen
      key={id}
      id={id}
      checkIn={read('checkIn')}
      checkOut={read('checkOut')}
      adults={read('adults')}
      numChildren={read('children')}
      numInfants={read('infants')}
      resultsHref={from?.startsWith('/search?') ? from : undefined}
    />
  );
}
