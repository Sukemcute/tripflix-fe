import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HotelScreen } from '@/features/hotels/hotel-screen';
import { buildHotelJsonLd, serializeJsonLd } from '@/features/seo/hotel-json-ld';
import { buildHotelFallbackMetadata, buildHotelMetadata } from '@/features/seo/page-metadata';
import { findPublicHotel } from '@/features/seo/public-data';
import { toAbsoluteUrl } from '@/lib/site';

/** Tiêu đề, mô tả, ảnh chia sẻ và canonical theo khách sạn thật (TF112). */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const hotel = await findPublicHotel(id);
  return hotel ? buildHotelMetadata(hotel) : buildHotelFallbackMetadata(id);
}

/** JSON-LD Hotel + BreadcrumbList cho máy tìm kiếm; không có dữ liệu thì bỏ qua. Đặt trong Suspense để API chậm không chặn trang. */
async function HotelStructuredData({ id }: { id: string }) {
  const hotel = await findPublicHotel(id);
  if (!hotel) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildHotelJsonLd(hotel, toAbsoluteUrl)) }}
    />
  );
}

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
    <>
      <Suspense fallback={null}>
        <HotelStructuredData id={id} />
      </Suspense>
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
    </>
  );
}
