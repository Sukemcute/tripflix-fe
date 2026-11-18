import type { AssistantCard } from '@tripflix/api-client';
import { buildPostHref } from '../social/search-url';

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
