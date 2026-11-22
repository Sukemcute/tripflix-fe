import { groupItineraryLines, type ItineraryLineInput } from './assistant-card-format';
import { readTripBuilderSeed } from './trip-builder-seed';
import type { TripPlanSelection } from './trip-plan-selection';

/** Mã "bài" của kế hoạch Tripi lập: không phải bài đăng thật nên không gửi làm nguồn đơn. */
const ASSISTANT_PLAN_PREFIX = 'tripi:';

export function isAssistantPlanId(postId: string): boolean {
  return postId.startsWith(ASSISTANT_PLAN_PREFIX);
}

/**
 * Kế hoạch Tripi chốt thành lộ trình cho màn Đặt theo lộ trình: điểm từng ngày thành gợi ý sửa được,
 * khách sạn và chuyến bay trong params của nút Đặt thành mục đặt được (giá lấy ở màn đặt).
 */
export function buildAssistantTripSelection(
  card: {
    ref: string;
    title: string;
    lines?: readonly (ItineraryLineInput & { service?: string | null })[] | null;
  },
  params: Record<string, unknown>,
  options: { authorName: string; today: string },
): TripPlanSelection | null {
  const seed = readTripBuilderSeed(params, options.today);
  const items: NonNullable<TripPlanSelection['trip']['items']> = [];
  // Dòng bay, nhận/trả phòng đã thành mục đặt được từ params nên không chép lại thành gợi ý.
  const stopLines = (card.lines ?? []).filter((line) => line.service !== 'flight' && line.service !== 'stay');
  for (const group of groupItineraryLines(stopLines)) {
    // Dòng không ghi ngày ("Điểm") xếp vào ngày 1 để không mất điểm Tripi gợi ý.
    const day = group.day ?? 1;
    for (const stop of group.stops) {
      items.push({
        day,
        title: stop.title,
        ...(stop.place ? { location: stop.place } : {}),
        ...(stop.partLabel ? { notes: stop.partLabel } : {}),
      });
    }
  }
  if (seed?.flight) {
    items.unshift({
      day: 1,
      title: `${seed.flight.from} → ${seed.flight.to}`,
      transport: { mode: 'flight', fromAirport: seed.flight.from, toAirport: seed.flight.to },
    });
  }
  const daysCount = Math.max(seed?.dayCount ?? 0, ...items.map((item) => item.day), 1);
  // Chuyến bay về ở ngày cuối; readTripBuilderSeed chỉ đọc chiều đi.
  const read = (key: string) => (typeof params[key] === 'string' ? params[key].trim() : '');
  const [returnFrom, returnTo] = [read('returnFrom'), read('returnTo')];
  if (/^[A-Z]{3}$/.test(returnFrom) && /^[A-Z]{3}$/.test(returnTo) && returnFrom !== returnTo) {
    items.push({
      day: daysCount,
      title: `${returnFrom} → ${returnTo}`,
      transport: { mode: 'flight', fromAirport: returnFrom, toAirport: returnTo },
    });
  }
  if (!items.length && !seed?.hotel) return null;
  return {
    postId: `${ASSISTANT_PLAN_PREFIX}${card.ref}`,
    postTitle: card.title,
    authorName: options.authorName,
    trip: {
      ...(seed?.destination.destinationName ? { destinationName: seed.destination.destinationName } : {}),
      ...(seed?.hotel ? { hotelId: seed.hotel.hotelId, hotelName: seed.hotel.hotelName || undefined } : {}),
      daysCount,
      items,
    },
  };
}
