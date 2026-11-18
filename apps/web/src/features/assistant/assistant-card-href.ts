import type { AssistantCard } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { buildPostHref } from '../social/search-url';

type CardAction = NonNullable<AssistantCard['actions']>[number];

/** Web chưa có builder combo; chỉ dựng đường dẫn nội bộ từ các phần còn đặt được. */
export function getAssistantBookingLinks(action: CardAction): { label: string; href: string }[] {
  if (action.type !== 'book' || action.path !== '/trip-builder' || !action.params) return [];
  const { hotelId, checkIn, nights, adults, flightFrom, flightTo, flightDate } = action.params;
  const links: { label: string; href: string }[] = [];
  if (hotelId && hotelId !== '.' && hotelId !== '..') {
    const query = new URLSearchParams();
    const date = new Date(`${checkIn}T00:00:00Z`);
    const nightCount = Number(nights);
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(checkIn ?? '') &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === checkIn &&
      Number.isInteger(nightCount) &&
      nightCount > 0 &&
      nightCount <= 30
    ) {
      date.setUTCDate(date.getUTCDate() + nightCount);
      query.set('checkIn', checkIn);
      query.set('checkOut', date.toISOString().slice(0, 10));
    }
    if (adults) query.set('adults', adults);
    links.push({
      label: vi.assistant.bookHotel,
      href: `/hotels/${encodeURIComponent(hotelId)}${query.size ? `?${query}` : ''}`,
    });
  }
  if (flightFrom && flightTo && flightDate) {
    const query = new URLSearchParams({
      from: flightFrom,
      to: flightTo,
      date: flightDate,
      passengers: adults ?? '1',
    });
    links.push({ label: vi.assistant.bookFlight, href: `/flights?${query}` });
  }
  return links;
}

/**
 * Trang web mở khi bấm thẻ Tripi, cùng đích với app: nơi ở → chi tiết khách sạn; vé → trang chọn vé tự tìm lại
 * theo tuyến, ngày, số khách (giá luôn lấy mới); video có trong feed → mở reel; còn lại → bài ở trang Cảm hứng.
 */
export function getAssistantCardHref(card: AssistantCard, options: { isReel?: boolean } = {}): string {
  if (card.kind === 'stay') return `/hotels/${encodeURIComponent(card.id)}`;
  if (card.kind === 'flight') {
    const query = new URLSearchParams({
      from: card.fromAirport ?? '',
      to: card.toAirport ?? '',
      date: card.flightDate ?? '',
      passengers: String(card.passengers ?? 1),
    });
    return `/flights?${query}`;
  }
  return buildPostHref(card.id, options.isReel ? { postType: 'video' } : {});
}
